// OlchaAI — Go Real-Time Microservice
// High-performance WebSocket hub + feed ranking engine + live stream signaling
// Serves: /go/ws (WebSocket), /go/health, /go/rank, /go/trending, /go/live/rooms
package main

import (
        "database/sql"
        "encoding/json"
        "math"
        "net/http"
        "os"
        "sort"
        "strconv"
        "strings"
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

func (h *Hub) sendTo(userID int, msg []byte) {
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

func (h *Hub) broadcast(userID int, msg []byte) {
        h.sendTo(userID, msg)
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

// ─── Live Room Management ─────────────────────────────────────────────────────

type LiveRoom struct {
        ID        string       `json:"id"`
        HostID    int          `json:"hostId"`
        Title     string       `json:"title"`
        StartedAt time.Time    `json:"startedAt"`
        ViewerIDs map[int]bool `json:"-"`
        mu        sync.RWMutex
}

func (r *LiveRoom) addViewer(id int) {
        r.mu.Lock()
        r.ViewerIDs[id] = true
        r.mu.Unlock()
}

func (r *LiveRoom) removeViewer(id int) {
        r.mu.Lock()
        delete(r.ViewerIDs, id)
        r.mu.Unlock()
}

func (r *LiveRoom) viewerCount() int {
        r.mu.RLock()
        defer r.mu.RUnlock()
        return len(r.ViewerIDs)
}

type LiveHub struct {
        mu    sync.RWMutex
        rooms map[string]*LiveRoom
}

func newLiveHub() *LiveHub {
        return &LiveHub{rooms: make(map[string]*LiveRoom)}
}

func (lh *LiveHub) create(roomID string, hostID int, title string) *LiveRoom {
        room := &LiveRoom{
                ID:        roomID,
                HostID:    hostID,
                Title:     title,
                StartedAt: time.Now(),
                ViewerIDs: make(map[int]bool),
        }
        lh.mu.Lock()
        lh.rooms[roomID] = room
        lh.mu.Unlock()
        return room
}

func (lh *LiveHub) get(roomID string) (*LiveRoom, bool) {
        lh.mu.RLock()
        defer lh.mu.RUnlock()
        r, ok := lh.rooms[roomID]
        return r, ok
}

func (lh *LiveHub) remove(roomID string) {
        lh.mu.Lock()
        delete(lh.rooms, roomID)
        lh.mu.Unlock()
}

func (lh *LiveHub) list() []map[string]any {
        lh.mu.RLock()
        defer lh.mu.RUnlock()
        out := make([]map[string]any, 0, len(lh.rooms))
        for _, r := range lh.rooms {
                out = append(out, map[string]any{
                        "id":          r.ID,
                        "hostId":      r.HostID,
                        "title":       r.Title,
                        "startedAt":   r.StartedAt,
                        "viewerCount": r.viewerCount(),
                })
        }
        return out
}

// ─── WebSocket Message Routing ────────────────────────────────────────────────

type WSMessage struct {
        Type    string          `json:"type"`
        RoomID  string          `json:"roomId,omitempty"`
        ToID    int             `json:"toId,omitempty"`
        Payload json.RawMessage `json:"payload,omitempty"`
}

func relay(hub *Hub, toID int, msgType string, roomID string, fromID int, payload json.RawMessage) {
        out, _ := json.Marshal(map[string]any{
                "type":    msgType,
                "roomId":  roomID,
                "fromId":  fromID,
                "payload": payload,
                "ts":      time.Now().UnixMilli(),
        })
        hub.sendTo(toID, out)
}

func handleWSMessage(hub *Hub, liveHub *LiveHub, coViewHub *CoViewHub, c *Client, raw []byte) {
        var msg WSMessage
        if err := json.Unmarshal(raw, &msg); err != nil {
                return
        }
        switch msg.Type {

        case "live_start":
                var p struct {
                        RoomID string `json:"roomId"`
                        Title  string `json:"title"`
                }
                json.Unmarshal(msg.Payload, &p)
                if p.RoomID == "" {
                        return
                }
                liveHub.create(p.RoomID, c.userID, p.Title)
                ack, _ := json.Marshal(map[string]any{"type": "live_started", "roomId": p.RoomID, "ts": time.Now().UnixMilli()})
                hub.sendTo(c.userID, ack)
                log.Info().Str("room", p.RoomID).Int("host", c.userID).Msg("live:started")

        case "live_end":
                room, ok := liveHub.get(msg.RoomID)
                if !ok || room.HostID != c.userID {
                        return
                }
                ended, _ := json.Marshal(map[string]any{"type": "live_ended", "roomId": msg.RoomID, "ts": time.Now().UnixMilli()})
                room.mu.RLock()
                for vid := range room.ViewerIDs {
                        hub.sendTo(vid, ended)
                }
                room.mu.RUnlock()
                liveHub.remove(msg.RoomID)
                log.Info().Str("room", msg.RoomID).Msg("live:ended")

        case "live_join":
                room, ok := liveHub.get(msg.RoomID)
                if !ok {
                        notFound, _ := json.Marshal(map[string]any{"type": "live_not_found", "roomId": msg.RoomID})
                        hub.sendTo(c.userID, notFound)
                        return
                }
                room.addViewer(c.userID)
                viewerJoined, _ := json.Marshal(map[string]any{
                        "type":     "live_viewer_joined",
                        "roomId":   msg.RoomID,
                        "viewerId": c.userID,
                        "viewers":  room.viewerCount(),
                        "ts":       time.Now().UnixMilli(),
                })
                hub.sendTo(room.HostID, viewerJoined)
                joinedAck, _ := json.Marshal(map[string]any{
                        "type":   "live_joined",
                        "roomId": msg.RoomID,
                        "hostId": room.HostID,
                        "ts":     time.Now().UnixMilli(),
                })
                hub.sendTo(c.userID, joinedAck)
                log.Info().Str("room", msg.RoomID).Int("viewer", c.userID).Msg("live:viewer_joined")

        case "live_leave":
                room, ok := liveHub.get(msg.RoomID)
                if !ok {
                        return
                }
                room.removeViewer(c.userID)
                viewerLeft, _ := json.Marshal(map[string]any{
                        "type":     "live_viewer_left",
                        "roomId":   msg.RoomID,
                        "viewerId": c.userID,
                        "viewers":  room.viewerCount(),
                        "ts":       time.Now().UnixMilli(),
                })
                hub.sendTo(room.HostID, viewerLeft)

        case "live_offer":
                if msg.ToID == 0 {
                        return
                }
                relay(hub, msg.ToID, "live_offer", msg.RoomID, c.userID, msg.Payload)

        case "live_answer":
                if msg.ToID == 0 {
                        return
                }
                relay(hub, msg.ToID, "live_answer", msg.RoomID, c.userID, msg.Payload)

        case "live_ice":
                if msg.ToID == 0 {
                        return
                }
                relay(hub, msg.ToID, "live_ice", msg.RoomID, c.userID, msg.Payload)

        case "live_comment":
                room, ok := liveHub.get(msg.RoomID)
                if !ok {
                        return
                }
                commentMsg, _ := json.Marshal(map[string]any{
                        "type":    "live_comment",
                        "roomId":  msg.RoomID,
                        "fromId":  c.userID,
                        "payload": msg.Payload,
                        "ts":      time.Now().UnixMilli(),
                })
                hub.sendTo(room.HostID, commentMsg)
                room.mu.RLock()
                for vid := range room.ViewerIDs {
                        if vid != c.userID {
                                hub.sendTo(vid, commentMsg)
                        }
                }
                room.mu.RUnlock()

        case "live_react":
                room, ok := liveHub.get(msg.RoomID)
                if !ok {
                        return
                }
                reactMsg, _ := json.Marshal(map[string]any{
                        "type":    "live_react",
                        "roomId":  msg.RoomID,
                        "fromId":  c.userID,
                        "payload": msg.Payload,
                        "ts":      time.Now().UnixMilli(),
                })
                hub.sendTo(room.HostID, reactMsg)
                room.mu.RLock()
                for vid := range room.ViewerIDs {
                        hub.sendTo(vid, reactMsg)
                }
                room.mu.RUnlock()

        case "live_gift":
                room, ok := liveHub.get(msg.RoomID)
                if !ok {
                        return
                }
                giftMsg, _ := json.Marshal(map[string]any{
                        "type":    "live_gift_animation",
                        "roomId":  msg.RoomID,
                        "fromId":  c.userID,
                        "payload": msg.Payload,
                        "ts":      time.Now().UnixMilli(),
                })
                hub.sendTo(room.HostID, giftMsg)
                room.mu.RLock()
                for vid := range room.ViewerIDs {
                        hub.sendTo(vid, giftMsg)
                }
                room.mu.RUnlock()
                log.Info().Str("room", msg.RoomID).Int("from", c.userID).Msg("live:gift")

        case "coview_join":
                room := coViewHub.getOrCreate(msg.RoomID, c.userID)
                room.add(c.userID)
                ack, _ := json.Marshal(map[string]any{
                        "type":      "coview_joined",
                        "roomId":    msg.RoomID,
                        "isPlaying": room.IsPlaying,
                        "syncTime":  room.SyncTime,
                        "ts":        time.Now().UnixMilli(),
                })
                hub.sendTo(c.userID, ack)
                joined, _ := json.Marshal(map[string]any{
                        "type":     "coview_member_joined",
                        "roomId":   msg.RoomID,
                        "memberId": c.userID,
                        "ts":       time.Now().UnixMilli(),
                })
                coViewHub.broadcastRoom(hub, msg.RoomID, joined, c.userID)
                log.Info().Str("room", msg.RoomID).Int("user", c.userID).Msg("coview:joined")

        case "coview_leave":
                room, ok := coViewHub.get(msg.RoomID)
                if !ok {
                        return
                }
                room.remove(c.userID)
                left, _ := json.Marshal(map[string]any{
                        "type":     "coview_member_left",
                        "roomId":   msg.RoomID,
                        "memberId": c.userID,
                        "ts":       time.Now().UnixMilli(),
                })
                coViewHub.broadcastRoom(hub, msg.RoomID, left, c.userID)

        case "coview_sync":
                room, ok := coViewHub.get(msg.RoomID)
                if !ok {
                        return
                }
                if room.HostID != c.userID {
                        return
                }
                var p struct {
                        Playing bool    `json:"playing"`
                        Time    float64 `json:"time"`
                }
                json.Unmarshal(msg.Payload, &p)
                room.mu.Lock()
                room.IsPlaying = p.Playing
                room.SyncTime = p.Time
                room.mu.Unlock()
                syncMsg, _ := json.Marshal(map[string]any{
                        "type":    "coview_sync",
                        "roomId":  msg.RoomID,
                        "fromId":  c.userID,
                        "payload": msg.Payload,
                        "ts":      time.Now().UnixMilli(),
                })
                coViewHub.broadcastRoom(hub, msg.RoomID, syncMsg, c.userID)

        case "coview_chat":
                chatMsg, _ := json.Marshal(map[string]any{
                        "type":    "coview_chat",
                        "roomId":  msg.RoomID,
                        "fromId":  c.userID,
                        "payload": msg.Payload,
                        "ts":      time.Now().UnixMilli(),
                })
                coViewHub.broadcastRoom(hub, msg.RoomID, chatMsg, c.userID)

        // ── Direct-message typing indicator ──
        case "dm_typing":
                if msg.ToID == 0 {
                        return
                }
                relay(hub, msg.ToID, "dm_typing", msg.RoomID, c.userID, msg.Payload)

        // ── 1:1 call signaling (voice/video) — relayed peer-to-peer, no server state ──
        case "call_invite", "call_accept", "call_decline", "call_hangup", "call_offer", "call_answer", "call_ice":
                if msg.ToID == 0 {
                        return
                }
                relay(hub, msg.ToID, msg.Type, msg.RoomID, c.userID, msg.Payload)
                log.Debug().Str("type", msg.Type).Int("from", c.userID).Int("to", msg.ToID).Msg("call:relay")

        default:
                log.Debug().Int("userID", c.userID).Str("type", msg.Type).Msg("ws:unknown_msg")
        }
}

// ─── CoView Hub ───────────────────────────────────────────────────────────────

type CoViewRoom struct {
        HostID    int
        Members   map[int]bool
        IsPlaying bool
        SyncTime  float64
        mu        sync.RWMutex
}

func (r *CoViewRoom) add(id int) {
        r.mu.Lock()
        r.Members[id] = true
        r.mu.Unlock()
}

func (r *CoViewRoom) remove(id int) {
        r.mu.Lock()
        delete(r.Members, id)
        r.mu.Unlock()
}

type CoViewHub struct {
        mu    sync.RWMutex
        rooms map[string]*CoViewRoom
}

func newCoViewHub() *CoViewHub { return &CoViewHub{rooms: make(map[string]*CoViewRoom)} }

func (cv *CoViewHub) getOrCreate(code string, hostID int) *CoViewRoom {
        cv.mu.Lock()
        defer cv.mu.Unlock()
        if r, ok := cv.rooms[code]; ok {
                return r
        }
        r := &CoViewRoom{HostID: hostID, Members: make(map[int]bool)}
        cv.rooms[code] = r
        return r
}

func (cv *CoViewHub) get(code string) (*CoViewRoom, bool) {
        cv.mu.RLock()
        defer cv.mu.RUnlock()
        r, ok := cv.rooms[code]
        return r, ok
}

func (cv *CoViewHub) broadcastRoom(hub *Hub, code string, msg []byte, excludeID int) {
        cv.mu.RLock()
        room, ok := cv.rooms[code]
        cv.mu.RUnlock()
        if !ok {
                return
        }
        room.mu.RLock()
        defer room.mu.RUnlock()
        for uid := range room.Members {
                if uid != excludeID {
                        hub.sendTo(uid, msg)
                }
        }
}

// ─── WebSocket Upgrade ────────────────────────────────────────────────────────

var upgrader = websocket.Upgrader{
        CheckOrigin:     func(r *http.Request) bool { return true },
        ReadBufferSize:  4096,
        WriteBufferSize: 4096,
}

func serveWS(hub *Hub, liveHub *LiveHub, coViewHub *CoViewHub, w http.ResponseWriter, r *http.Request) {
        userIDStr := r.URL.Query().Get("userId")
        userID, _ := strconv.Atoi(userIDStr)

        conn, err := upgrader.Upgrade(w, r, nil)
        if err != nil {
                log.Error().Err(err).Msg("ws:upgrade")
                return
        }

        c := &Client{userID: userID, conn: conn, send: make(chan []byte, 128)}
        hub.register(c)

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

        defer hub.unregister(c)
        conn.SetReadLimit(32768)
        conn.SetReadDeadline(time.Now().Add(60 * time.Second))
        conn.SetPongHandler(func(string) error {
                conn.SetReadDeadline(time.Now().Add(60 * time.Second))
                return nil
        })
        for {
                _, raw, err := conn.ReadMessage()
                if err != nil {
                        break
                }
                conn.SetReadDeadline(time.Now().Add(60 * time.Second))
                handleWSMessage(hub, liveHub, coViewHub, c, raw)
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

func rankScore(p Post) float64 {
        now := time.Now()
        ageH := now.Sub(p.CreatedAt).Hours()
        if ageH < 0 {
                ageH = 0
        }
        engagement := float64(p.Likes)*1.0 + float64(p.Comments)*3.0 + float64(p.Shares)*5.0
        views := math.Max(float64(p.Views), 1)
        engRate := engagement / views
        decay := math.Exp(-0.693 * ageH / 12.0)
        n := float64(p.Likes + p.Views)
        if n < 1 {
                n = 1
        }
        p_hat := float64(p.Likes) / n
        z := 1.96
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
                        "engine": "OlchaAI-Go-RankV1",
                        "ts":     time.Now().UnixMilli(),
                })
        }
}

// ─── Trending Topics ──────────────────────────────────────────────────────────

type Trend struct {
        Tag   string  `json:"tag"`
        Count int     `json:"count"`
        Score float64 `json:"score"`
        Delta float64 `json:"delta"`
}

func handleTrending(db *sql.DB) http.HandlerFunc {
        return func(w http.ResponseWriter, r *http.Request) {
                if db == nil {
                        trends := []Trend{
                                {Tag: "#OlchaAI", Count: 4820, Score: 98.2, Delta: 12.4},
                                {Tag: "#TechUz", Count: 3100, Score: 87.5, Delta: 8.1},
                                {Tag: "#AI2026", Count: 2750, Score: 82.3, Delta: 5.6},
                                {Tag: "#GoLang", Count: 1980, Score: 74.1, Delta: 22.0},
                                {Tag: "#TensorFlow", Count: 1620, Score: 69.8, Delta: 15.3},
                                {Tag: "#Kubernetes", Count: 1340, Score: 63.4, Delta: 9.7},
                                {Tag: "#Toshkent", Count: 980, Score: 55.2, Delta: 3.2},
                                {Tag: "#Uzbekistan", Count: 870, Score: 51.0, Delta: 1.8},
                        }
                        w.Header().Set("Content-Type", "application/json")
                        json.NewEncoder(w).Encode(map[string]any{"trending": trends, "engine": "OlchaAI-Go-TrendV1"})
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
                json.NewEncoder(w).Encode(map[string]any{"trending": trends, "engine": "OlchaAI-Go-TrendV1"})
        }
}

// ─── Stats ─────────────────────────────────────────────────────────────────────

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
                        "engine":      "OlchaAI-Go-WSHub",
                        "goVersion":   "1.25",
                        "uptime":      time.Since(startTime).String(),
                })
        }
}

// ─── Presence endpoint ─────────────────────────────────────────────────────────
// GET /go/presence?ids=1,2,3 — returns which of the given userIDs currently have
// an active WebSocket connection. This is the only real "online" source of truth;
// ghost-mode masking of these results happens in the Express layer, not here.

func handlePresence(hub *Hub) http.HandlerFunc {
        return func(w http.ResponseWriter, r *http.Request) {
                idsParam := r.URL.Query().Get("ids")
                result := map[string]bool{}
                if idsParam != "" {
                        for _, part := range strings.Split(idsParam, ",") {
                                id, err := strconv.Atoi(strings.TrimSpace(part))
                                if err != nil {
                                        continue
                                }
                                hub.mu.RLock()
                                _, online := hub.clients[id]
                                hub.mu.RUnlock()
                                result[strconv.Itoa(id)] = online
                        }
                }
                w.Header().Set("Content-Type", "application/json")
                json.NewEncoder(w).Encode(map[string]any{"presence": result})
        }
}

// ─── Notify endpoint ───────────────────────────────────────────────────────────

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

// ─── Live Rooms List ───────────────────────────────────────────────────────────

func handleLiveRooms(liveHub *LiveHub) http.HandlerFunc {
        return func(w http.ResponseWriter, r *http.Request) {
                rooms := liveHub.list()
                if rooms == nil {
                        rooms = []map[string]any{}
                }
                w.Header().Set("Content-Type", "application/json")
                json.NewEncoder(w).Encode(map[string]any{"rooms": rooms, "count": len(rooms)})
        }
}

// ─── Force-end a live room (called by Express after DB update) ─────────────────

func handleLiveForceEnd(hub *Hub, liveHub *LiveHub) http.HandlerFunc {
        return func(w http.ResponseWriter, r *http.Request) {
                var req struct {
                        RoomID string `json:"roomId"`
                }
                if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.RoomID == "" {
                        http.Error(w, `{"error":"roomId required"}`, http.StatusBadRequest)
                        return
                }
                room, ok := liveHub.get(req.RoomID)
                if !ok {
                        w.Header().Set("Content-Type", "application/json")
                        json.NewEncoder(w).Encode(map[string]any{"ok": true, "note": "room not found"})
                        return
                }
                ended, _ := json.Marshal(map[string]any{"type": "live_ended", "roomId": req.RoomID, "ts": time.Now().UnixMilli()})
                room.mu.RLock()
                for vid := range room.ViewerIDs {
                        hub.sendTo(vid, ended)
                }
                room.mu.RUnlock()
                liveHub.remove(req.RoomID)
                w.Header().Set("Content-Type", "application/json")
                json.NewEncoder(w).Encode(map[string]any{"ok": true})
        }
}

var startTime = time.Now()

// ─── Main ──────────────────────────────────────────────────────────────────────

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
        liveHub := newLiveHub()
        coViewHub := newCoViewHub()
        mux := http.NewServeMux()

        mux.HandleFunc("/go/health", func(w http.ResponseWriter, r *http.Request) {
                w.Header().Set("Content-Type", "application/json")
                json.NewEncoder(w).Encode(map[string]any{
                        "ok": true, "service": "olcha-go", "goVersion": "1.25",
                        "uptime": time.Since(startTime).String(),
                })
        })

        mux.HandleFunc("/go/ws", func(w http.ResponseWriter, r *http.Request) {
                serveWS(hub, liveHub, coViewHub, w, r)
        })

        mux.HandleFunc("/go/rank", handleRank(db))
        mux.HandleFunc("/go/trending", handleTrending(db))
        mux.HandleFunc("/go/notify", handleNotify(hub))
        mux.HandleFunc("/go/stats", handleStats(hub))
        mux.HandleFunc("/go/presence", handlePresence(hub))
        mux.HandleFunc("/go/live/rooms", handleLiveRooms(liveHub))
        mux.HandleFunc("/go/live/end-room", handleLiveForceEnd(hub, liveHub))

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
