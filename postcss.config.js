export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
    // CSS optimization for production builds
    ...(process.env.NODE_ENV === 'production' && {
      cssnano: {
        preset: ['default', {
          discardComments: {
            removeAll: true,
          },
          normalizeWhitespace: true,
          minifySelectors: true,
          minifyParams: true,
          // Prevent webkit property parsing issues
          normalizeProperties: {
            // Preserve webkit vendor prefixes
            allowDeclarationMerging: false,
          },
          // Don't merge webkit vendor prefixes
          mergeRules: false,
        }],
      },
    }),
  },
}
