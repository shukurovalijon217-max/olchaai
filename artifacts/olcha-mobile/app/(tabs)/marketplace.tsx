import React, { useState, useCallback } from "react";
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  Image, StyleSheet, RefreshControl, ActivityIndicator,
  Pressable, ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? "";

const CATEGORIES = [
  { id: "electronics", label: "Elektronika", emoji: "📱" },
  { id: "clothing", label: "Kiyim", emoji: "👗" },
  { id: "food", label: "Oziq-ovqat", emoji: "🍎" },
  { id: "services", label: "Xizmatlar", emoji: "🛠️" },
  { id: "digital", label: "Raqamli", emoji: "💻" },
  { id: "beauty", label: "Go'zallik", emoji: "💄" },
  { id: "sport", label: "Sport", emoji: "⚽" },
  { id: "home", label: "Uy", emoji: "🏠" },
  { id: "automotive", label: "Avto", emoji: "🚗" },
  { id: "books", label: "Kitoblar", emoji: "📚" },
  { id: "other", label: "Boshqa", emoji: "📦" },
];

type Product = {
  id: number;
  title: string;
  price: number;
  originalPrice?: number;
  thumbnailUrl?: string;
  condition: string;
  location?: string;
  viewsCount: number;
  rating: number;
  reviewsCount: number;
  seller?: { displayName: string; avatarUrl?: string };
};

function formatPrice(p: number) {
  return (p / 100).toLocaleString("uz-UZ") + " so'm";
}

function ProductCard({ item, colors, onPress }: { item: Product; colors: any; onPress: () => void }) {
  const discount = item.originalPrice && item.originalPrice > item.price
    ? Math.round((1 - item.price / item.originalPrice) * 100) : null;

  return (
    <TouchableOpacity onPress={onPress} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]} activeOpacity={0.85}>
      <View style={[styles.cardImage, { backgroundColor: colors.muted }]}>
        {item.thumbnailUrl ? (
          <Image source={{ uri: item.thumbnailUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <Text style={{ fontSize: 36 }}>🛍️</Text>
        )}
        {discount ? (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>-{discount}%</Text>
          </View>
        ) : item.condition === "new" ? (
          <View style={[styles.discountBadge, { backgroundColor: "#059669" }]}>
            <Text style={styles.discountText}>Yangi</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.cardBody}>
        <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={2}>{item.title}</Text>
        <Text style={[styles.cardPrice, { color: colors.primary }]}>{formatPrice(item.price)}</Text>
        {item.originalPrice && item.originalPrice > item.price && (
          <Text style={[styles.cardOrigPrice, { color: colors.mutedForeground }]}>{formatPrice(item.originalPrice)}</Text>
        )}
        {item.location ? (
          <Text style={[styles.cardMeta, { color: colors.mutedForeground }]}>📍 {item.location}</Text>
        ) : null}
        <Text style={[styles.cardMeta, { color: colors.mutedForeground }]}>👁 {item.viewsCount}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function MarketplaceScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [offset, setOffset] = useState(0);
  const LIMIT = 20;

  const fetchProducts = useCallback(async (reset = false, q = search, cat = category) => {
    const off = reset ? 0 : offset;
    try {
      const params = new URLSearchParams({ limit: String(LIMIT), offset: String(off) });
      if (q) params.set("q", q);
      if (cat) params.set("category", cat);
      const r = await fetch(`${API_BASE}/api/marketplace/products?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });
      const data = await r.json();
      setProducts(reset ? data.products : prev => [...prev, ...data.products]);
      setTotal(data.total);
      setOffset(reset ? LIMIT : off + LIMIT);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [offset, search, category, token]);

  React.useEffect(() => {
    setLoading(true);
    fetchProducts(true, search, category);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, category]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts(true);
  };

  const loadMore = () => {
    if (products.length < total && !loading) fetchProducts(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerTop}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>🛍️ Bozor</Text>
          <TouchableOpacity
            style={[styles.sellBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/(tabs)/index")}
          >
            <Feather name="plus" size={14} color="#fff" />
            <Text style={styles.sellBtnText}>Sotish</Text>
          </TouchableOpacity>
        </View>
        {/* Search */}
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Mahsulot qidirish..."
            placeholderTextColor={colors.mutedForeground}
            style={[styles.searchInput, { color: colors.foreground }]}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
        {/* Category pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll} contentContainerStyle={styles.catContent}>
          <TouchableOpacity
            onPress={() => setCategory("")}
            style={[styles.catPill, { backgroundColor: !category ? colors.primary : colors.card, borderColor: colors.border }]}
          >
            <Text style={[styles.catPillText, { color: !category ? "#fff" : colors.mutedForeground }]}>Barchasi</Text>
          </TouchableOpacity>
          {CATEGORIES.map(c => (
            <TouchableOpacity
              key={c.id}
              onPress={() => setCategory(category === c.id ? "" : c.id)}
              style={[styles.catPill, { backgroundColor: category === c.id ? colors.primary : colors.card, borderColor: colors.border }]}
            >
              <Text style={[styles.catPillText, { color: category === c.id ? "#fff" : colors.mutedForeground }]}>
                {c.emoji} {c.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading && products.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={products}
          numColumns={2}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <ProductCard
              item={item}
              colors={colors}
              onPress={() => router.push(`/(tabs)/index`)}
            />
          )}
          contentContainerStyle={[styles.grid, { paddingBottom: insets.bottom + 80 }]}
          columnWrapperStyle={{ gap: 10 }}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListHeaderComponent={
            total > 0 ? (
              <Text style={[styles.totalText, { color: colors.mutedForeground }]}>{total} ta mahsulot</Text>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>🛍️</Text>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Mahsulotlar topilmadi</Text>
              <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
                {search ? `"${search}" bo'yicha hech narsa yo'q` : "Hali mahsulotlar qo'shilmagan"}
              </Text>
            </View>
          }
          ListFooterComponent={
            products.length < total && !loading ? (
              <Pressable onPress={loadMore} style={[styles.loadMore, { borderColor: colors.border }]}>
                <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "600" }}>Ko'proq yuklash</Text>
              </Pressable>
            ) : loading && products.length > 0 ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, borderBottomWidth: 0.5 },
  headerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  headerTitle: { fontSize: 20, fontWeight: "700", fontFamily: "Inter_700Bold" },
  sellBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  sellBtnText: { color: "#fff", fontSize: 13, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  searchBar: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 20, borderWidth: 1, marginBottom: 10 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", padding: 0 },
  catScroll: { marginHorizontal: -16, paddingLeft: 16 },
  catContent: { paddingRight: 16, gap: 8, paddingBottom: 2 },
  catPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  catPillText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  grid: { paddingHorizontal: 12, paddingTop: 12, gap: 10 },
  card: { flex: 1, borderRadius: 14, overflow: "hidden", borderWidth: 0.5 },
  cardImage: { width: "100%", aspectRatio: 1, alignItems: "center", justifyContent: "center", position: "relative" },
  discountBadge: { position: "absolute", top: 8, left: 8, backgroundColor: "#dc2626", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  discountText: { color: "#fff", fontSize: 10, fontWeight: "700", fontFamily: "Inter_700Bold" },
  cardBody: { padding: 10, gap: 2 },
  cardTitle: { fontSize: 12, fontWeight: "500", fontFamily: "Inter_500Medium", lineHeight: 16 },
  cardPrice: { fontSize: 13, fontWeight: "700", fontFamily: "Inter_700Bold" },
  cardOrigPrice: { fontSize: 11, textDecorationLine: "line-through", fontFamily: "Inter_400Regular" },
  cardMeta: { fontSize: 10, fontFamily: "Inter_400Regular" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  totalText: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 8, paddingHorizontal: 4 },
  empty: { alignItems: "center", paddingVertical: 60, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 16, fontWeight: "600", fontFamily: "Inter_600SemiBold", marginBottom: 6 },
  emptySubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  loadMore: { marginHorizontal: 12, marginBottom: 8, paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: "center" },
});
