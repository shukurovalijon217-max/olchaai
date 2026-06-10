const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Block Metro from watching pnpm's temporary directories that get created
// during install and then removed — watching a deleted path crashes Metro.
config.resolver.blockList = [
  // pnpm temp dirs (e.g. are-we-there-yet_tmp_XXXXX)
  /node_modules\/\.pnpm\/.*_tmp_[^/]+\//,
  // Any other stale watch paths
  /node_modules\/\.cache\//,
  // Replit agent skill directories (may contain deleted/stale sub-paths)
  /\.local[/\\]skills[/\\]/,
];

// Workspace root so Metro can resolve monorepo packages
const workspaceRoot = path.resolve(__dirname, "../..");
const projectRoot = __dirname;

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

module.exports = config;
