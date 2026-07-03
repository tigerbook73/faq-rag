// NativeWind's own type packages (nativewind/types, react-native-css-interop/types)
// only augment component props with `className`; they don't declare a module type
// for importing .css files, so side-effect imports like `import "./global.css"`
// fail tsc with TS2882 unless declared here.
declare module "*.css";
