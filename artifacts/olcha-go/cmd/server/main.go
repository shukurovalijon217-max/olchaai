// OlCha — Go Real-Time Microservice
// High-performance WebSocket hub + feed ranking engine
// Serves: /ws/* (WebSocket), /go/health, /go/rank, /go/trending
package main

import (
	"database/sql"
	"encoding/json"
	"math"
	"net/http"
	"os"
	"sort"
	"strconv"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	_ "github.com/lib/pq"
	"github.com/rs/cors"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

// ─── WebSocket Hub ────────────────────────────────────────────────────────────

type Client struct {
	userID int
	conn   *websocket.Conn
	send   chan []byte
}

type Hub struct {
	mu      sync.RWMutex
	clients map[int][]*Client
}

func newHub() *Hub { return &Hub{clients: make(map[int][]*Client)} }

func (h *Hub) register(c *Client) {
	h.mu.Lock()
	h.clients[c.userID] = append(h.clients[c.userID], c)
	h.mu.Unlock()
	log.Info().Int("userID", c.userID).Int("total", h.count()).Msg("ws:connect")
}

func (h *Hub) unregister(c *Client) {
	h.mu.Lock()
	list := h.clients[c.userID]
	for i, cl := range list {
		if cl == c {
			h.clients[c.userID] = append(list[:i], list[i+1:]...)
			break
		}
	}
	if len(h.clients[c.userID]) == 0 {
		delete(h.clients, c.userID)
	}
	h.mu.Unlock()
	close(c.send)
	log.Info().Int("userID", c.userID).Msg("ws:disconnect")
}

func (h *Hub) count() int {
	total := 0
	for _, list := range h.clients {
		total += len(list)
	}
	return total
}

func (h *Hub) broadcast(userID int, msg []byte) {
	h.mu.RLock()
	targets := h.clients[userID]
	h.mu.RUnlock()
	for _, c := range targets {
		select {
		case c.send <- msg:
		default:
		}
	}
}

func (h *Hub) broadcastAll(msg []byte) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	for _, list := range h.clients {
		for _, c := range list {
			select {
			case c.send <- msg:
			default:
			}
		}
	}
}

var upgrader = websocket.Upgrader{
	CheckOrigin:     func(r *http.Request) bool { return true },
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

func serveWS(hub *Hub, w http.ResponseWriter, r *http.Request) {
	userIDStr := r.URL.Query().Get("userId")
	userID, _ := strconv.Atoi(userIDStr)

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Error().Err(err).Msg("ws:upgrade")
		return
	}

	c := &Client{userID: userID, conn: conn, send: make(chan []byte, 64)}
	hub.register(c)

	// Writer
	go func() {
		ticker := time.NewTicker(30 * time.Second)
		defer func() { ticker.Stop(); conn.Close() }()
		for {
			select {
			case msg, ok := <-c.send:
				if !ok {
					conn.WriteMessage(websocket.CloseMessage, []byte{})
					return
				}
				conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
				if err := conn.WriteMessage(websocket.TextMessage, msg); err != nil {
					return
				}
			case <-ticker.C:
				conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
				if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
					return
				}
			}
		}
	}()

	// Reader
	defer hub.unregister(c)
	conn.SetReadLimit(4096)
	conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	conn.SetPongHandler(func(string) error {
		conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})
	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			break
		}
		// Echo event back (client can subscribe/unsubscribe rooms)
		log.Debug().Int("userID", userID).Str("msg", string(msg)).Msg("ws:recv")
	}
}

// ─── Feed Ranking Engine ──────────────────────────────────────────────────────

type Post struct {
	ID        int       `json:"id"`
	AuthorID  int       `json:"authorId"`
	Likes     int       `json:"likes"`
	Comments  int       `json:"comments"`
	Shares    int       `json:"shares"`
	Views     int       `json:"views"`
	CreatedAt time.Time `json:"createdAt"`
	Score     float64   `json:"score"`
}

// OlCha ranking formula (Wilson score + recency + engagement velocity)
func rankScore(p Post) float64 {
	now := time.Now()
	ageH := now.Sub(p.CreatedAt).Hours()
	if ageH < 0 {
		ageH = 0
	}

	// Engagement signals
	engagement := float64(p.Likes)*1.0 + float64(p.Comments)*3.0 + float64(p.Shares)*5.0
	views := math.Max(float64(p.Views), 1)
	engRate := engagement / views

	// Recency decay: exponential half-life of 12h
	decay := math.Exp(-0.693 * ageH / 12.0)

	// Wilson lower bound for like ratio
	n := float64(p.Likes + p.Views)
	if n < 1 {
		n = 1
	}
	p_hat := float64(p.Likes) / n
	z := 1.96 // 95% confidence
	wilson := (p_hat + z*z/(2*n) - z*math.Sqrt((p_hat*(1-p_hat)+z*z/(4*n))/n)) / (1 + z*z/n)

	score := (wilson*0.4 + engRate*0.3 + decay*0.3) * 1000
	return math.Round(score*100) / 100
}

func handleRank(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var posts []Post
		if err := json.NewDecoder(r.Body).Decode(&posts); err != nil {
			http.Error(w, `{"error":"invalid json"}`, http.StatusBadRequest)
			return
		}

		for i := range posts {
			posts[i].Score = rankScore(posts[i])
		}
		sort.Slice(posts, func(i, j int) bool { return posts[i].Score > posts[j].Score })

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]any{
			"ranked": posts,
			"engine": "OlCha-Go-RankV1",
			"ts":     time.Now().UnixMilli(),
		})
	}
}

// ─── Trending Topics ──────────────────────────────────────────────────────────

type Trend struct {
	Tag    string  `json:"tag"`
	Count  int     `json:"count"`
	Score  float64 `json:"score"`
	Delta  float64 `json:"delta"`
}

func handleTrending(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if db == nil {
			// Return mock trending when DB not available
			trends := []Trend{
				{Tag: "#OlCha", Count: 4820, Score: 98.2, Delta: 12.4},
				{Tag: "#TechUz", Count: 3100, Score: 87.5, Delta: 8.1},
				{Tag: "#AI2026", Count: 2750, Score: 82.3, Delta: 5.6},
				{Tag: "#GoLang", Count: 1980, Score: 74.1, Delta: 22.0},
				{Tag: "#TensorFlow", Count: 1620, Score: 69.8, Delta: 15.3},
				{Tag: "#Kubernetes", Count: 1340, Score: 63.4, Delta: 9.7},
				{Tag: "#Toshkent", Count: 980, Score: 55.2, Delta: 3.2},
				{Tag: "#Uzbekistan", Count: 870, Score: 51.0, Delta: 1.8},
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]any{"trending": trends, "engine": "OlCha-Go-TrendV1"})
			return
		}

		rows, err := db.Query(`
			SELECT tag, COUNT(*) as cnt
			FROM post_hashtags
			WHERE created_at > NOW() - INTERVAL '24 hours'
			GROUP BY tag ORDER BY cnt DESC LIMIT 20
		`)
		if err != nil {
			http.Error(w, `{"error":"db query failed"}`, http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		var trends []Trend
		for rows.Next() {
			var t Trend
			rows.Scan(&t.Tag, &t.Count)
			t.Score = math.Round(math.Log(float64(t.Count+1))*20*100) / 100
			trends = append(trends, t)
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]any{"trending": trends, "engine": "OlCha-Go-TrendV1"})
	}
}

// ─── Stats ────────────────────────────────────────────────────────────────────

func handleStats(hub *Hub) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		hub.mu.RLock()
		total := hub.count()
		users := len(hub.clients)
		hub.mu.RUnlock()
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]any{
			"connections": total,
			"uniqueUsers": users,
			"engine":      "OlCha-Go-WSHub",
			"goVersion":   "1.25",
			"uptime":      time.Since(startTime).String(),
		})
	}
}

// ─── Notify endpoint ─────────────────────────────────────────────────────────

type NotifyReq struct {
	UserID  int             `json:"userId"`
	Event   string          `json:"event"`
	Payload json.RawMessage `json:"payload"`
}

func handleNotify(hub *Hub) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req NotifyReq
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, `{"error":"invalid json"}`, http.StatusBadRequest)
			return
		}
		msg, _ := json.Marshal(map[string]any{
			"event":   req.Event,
			"payload": req.Payload,
			"ts":      time.Now().UnixMilli(),
		})
		if req.UserID == 0 {
			hub.broadcastAll(msg)
		} else {
			hub.broadcast(req.UserID, msg)
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]any{"ok": true, "delivered": req.UserID})
	}
}

var startTime = time.Now()

// ─── Main ─────────────────────────────────────────────────────────────────────

func main() {
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stderr})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8082"
	}
	dbURL := os.Getenv("DATABASE_URL")

	var db *sql.DB
	if dbURL != "" {
		var err error
		db, err = sql.Open("postgres", dbURL)
		if err == nil {
			db.SetMaxOpenConns(10)
			db.SetMaxIdleConns(5)
			if err = db.Ping(); err != nil {
				log.Warn().Err(err).Msg("db:ping failed — running without DB")
				db = nil
			} else {
				log.Info().Msg("db:connected")
			}
		}
	} else {
		log.Warn().Msg("DATABASE_URL not set — running without DB")
	}

	hub := newHub()
	mux := http.NewServeMux()

	// Health
	mux.HandleFunc("/go/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]any{
			"ok": true, "service": "olcha-go", "goVersion": "1.25",
			"uptime": time.Since(startTime).String(),
		})
	})

	// WebSocket
	mux.HandleFunc("/go/ws", func(w http.ResponseWriter, r *http.Request) {
		serveWS(hub, w, r)
	})

	// Feed ranking
	mux.HandleFunc("/go/rank", handleRank(db))

	// Trending
	mux.HandleFunc("/go/trending", handleTrending(db))

	// Real-time notify (called by Node API server)
	mux.HandleFunc("/go/notify", handleNotify(hub))

	// WS stats
	mux.HandleFunc("/go/stats", handleStats(hub))

	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders:   []string{"*"},
		AllowCredentials: true,
	})

	addr := ":" + port
	log.Info().Str("addr", addr).Msg("olcha-go:start")
	if err := http.ListenAndServe(addr, c.Handler(mux)); err != nil {
		log.Fatal().Err(err).Msg("server:fatal")
	}
}
