#include <iostream>
#include <string>
#include <vector>
#include <cstdint>
#include <cmath>
#include <sstream>
#include <iomanip>
#include <algorithm>
#include <fstream>

// OlCha Media Fingerprinter (C++)
// Computes perceptual hashes (pHash) for duplicate/similar image detection.
// Reads raw 8x8 grayscale pixel grid from stdin (64 space-separated ints 0-255).
// Outputs: phash (64-bit hex), similarity-ready DCT-based fingerprint.

static const int SIZE = 8;

// 1-D DCT-II (orthonormal)
static std::vector<double> dct1d(const std::vector<double>& v) {
    int n = (int)v.size();
    std::vector<double> out(n);
    for (int k = 0; k < n; ++k) {
        double s = 0.0;
        for (int i = 0; i < n; ++i)
            s += v[i] * std::cos(M_PI * k * (2.0 * i + 1) / (2.0 * n));
        out[k] = s * (k == 0 ? std::sqrt(1.0 / n) : std::sqrt(2.0 / n));
    }
    return out;
}

// 2-D DCT on SIZE×SIZE block
static std::vector<std::vector<double>> dct2d(const std::vector<std::vector<double>>& img) {
    std::vector<std::vector<double>> tmp(SIZE, std::vector<double>(SIZE));
    // rows
    for (int r = 0; r < SIZE; ++r) tmp[r] = dct1d(img[r]);
    // cols
    std::vector<std::vector<double>> out(SIZE, std::vector<double>(SIZE));
    for (int c = 0; c < SIZE; ++c) {
        std::vector<double> col(SIZE);
        for (int r = 0; r < SIZE; ++r) col[r] = tmp[r][c];
        col = dct1d(col);
        for (int r = 0; r < SIZE; ++r) out[r][c] = col[r];
    }
    return out;
}

int main() {
    // Read 64 grayscale pixel values from stdin
    std::vector<std::vector<double>> img(SIZE, std::vector<double>(SIZE));
    for (int r = 0; r < SIZE; ++r)
        for (int c = 0; c < SIZE; ++c) {
            int px;
            if (!(std::cin >> px)) {
                std::cerr << "{\"error\":\"invalid input: expected 64 grayscale pixels\"}\n";
                return 1;
            }
            img[r][c] = static_cast<double>(std::max(0, std::min(255, px)));
        }

    // DCT-based pHash
    auto dct = dct2d(img);

    // Use top-left 4×4 low-frequency block (skip DC at [0][0])
    std::vector<double> vals;
    for (int r = 0; r < 4; ++r)
        for (int c = 0; c < 4; ++c)
            if (!(r == 0 && c == 0)) vals.push_back(dct[r][c]);

    double mean = 0;
    for (double v : vals) mean += v;
    mean /= vals.size();

    // Build 64-bit hash (bits from full 8×8 DCT > mean)
    uint64_t hash = 0;
    std::vector<double> all_vals;
    for (int r = 0; r < SIZE; ++r)
        for (int c = 0; c < SIZE; ++c)
            all_vals.push_back(dct[r][c]);

    double all_mean = 0;
    for (double v : all_vals) all_mean += v;
    all_mean /= all_vals.size();

    for (int i = 0; i < 64; ++i)
        if (all_vals[i] > all_mean)
            hash |= (uint64_t(1) << i);

    // Compact fingerprint hex
    std::ostringstream hex;
    hex << std::hex << std::setw(16) << std::setfill('0') << hash;

    // Hamming weight (popcount)
    int popcount = __builtin_popcountll(hash);

    // Output JSON
    std::cout << "{"
              << "\"phash\":\"" << hex.str() << "\","
              << "\"mean\":" << std::fixed << std::setprecision(4) << mean << ","
              << "\"popcount\":" << popcount << ","
              << "\"algorithm\":\"dct-phash-8x8\","
              << "\"engine\":\"OlCha-C++-MediaHasher-v1\""
              << "}\n";
    return 0;
}
