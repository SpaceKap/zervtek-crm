"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(() => {
var exports = {};
exports.id = "app/api/auth/[...nextauth]/route";
exports.ids = ["app/api/auth/[...nextauth]/route"];
exports.modules = {

/***/ "@prisma/client":
/*!*********************************!*\
  !*** external "@prisma/client" ***!
  \*********************************/
/***/ ((module) => {

module.exports = require("@prisma/client");

/***/ }),

/***/ "../../client/components/action-async-storage.external":
/*!*******************************************************************************!*\
  !*** external "next/dist/client/components/action-async-storage.external.js" ***!
  \*******************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/client/components/action-async-storage.external.js");

/***/ }),

/***/ "../../client/components/request-async-storage.external":
/*!********************************************************************************!*\
  !*** external "next/dist/client/components/request-async-storage.external.js" ***!
  \********************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/client/components/request-async-storage.external.js");

/***/ }),

/***/ "../../client/components/static-generation-async-storage.external":
/*!******************************************************************************************!*\
  !*** external "next/dist/client/components/static-generation-async-storage.external.js" ***!
  \******************************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/client/components/static-generation-async-storage.external.js");

/***/ }),

/***/ "next/dist/compiled/next-server/app-page.runtime.dev.js":
/*!*************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-page.runtime.dev.js" ***!
  \*************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/compiled/next-server/app-page.runtime.dev.js");

/***/ }),

/***/ "next/dist/compiled/next-server/app-route.runtime.dev.js":
/*!**************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-route.runtime.dev.js" ***!
  \**************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/compiled/next-server/app-route.runtime.dev.js");

/***/ }),

/***/ "assert":
/*!*************************!*\
  !*** external "assert" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("assert");

/***/ }),

/***/ "buffer":
/*!*************************!*\
  !*** external "buffer" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("buffer");

/***/ }),

/***/ "crypto":
/*!*************************!*\
  !*** external "crypto" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("crypto");

/***/ }),

/***/ "events":
/*!*************************!*\
  !*** external "events" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("events");

/***/ }),

/***/ "http":
/*!***********************!*\
  !*** external "http" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("http");

/***/ }),

/***/ "https":
/*!************************!*\
  !*** external "https" ***!
  \************************/
/***/ ((module) => {

module.exports = require("https");

/***/ }),

/***/ "querystring":
/*!******************************!*\
  !*** external "querystring" ***!
  \******************************/
/***/ ((module) => {

module.exports = require("querystring");

/***/ }),

/***/ "url":
/*!**********************!*\
  !*** external "url" ***!
  \**********************/
/***/ ((module) => {

module.exports = require("url");

/***/ }),

/***/ "util":
/*!***********************!*\
  !*** external "util" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("util");

/***/ }),

/***/ "zlib":
/*!***********************!*\
  !*** external "zlib" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("zlib");

/***/ }),

/***/ "(rsc)/../../node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fauth%2F%5B...nextauth%5D%2Froute&page=%2Fapi%2Fauth%2F%5B...nextauth%5D%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fauth%2F%5B...nextauth%5D%2Froute.ts&appDir=%2FUsers%2Favishka%2FDocuments%2FZervtek%2FInquiry%20Pooler%2Fapps%2Fcustomer-portal%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Favishka%2FDocuments%2FZervtek%2FInquiry%20Pooler%2Fapps%2Fcustomer-portal&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!":
/*!********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ../../node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fauth%2F%5B...nextauth%5D%2Froute&page=%2Fapi%2Fauth%2F%5B...nextauth%5D%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fauth%2F%5B...nextauth%5D%2Froute.ts&appDir=%2FUsers%2Favishka%2FDocuments%2FZervtek%2FInquiry%20Pooler%2Fapps%2Fcustomer-portal%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Favishka%2FDocuments%2FZervtek%2FInquiry%20Pooler%2Fapps%2Fcustomer-portal&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D! ***!
  \********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   originalPathname: () => (/* binding */ originalPathname),\n/* harmony export */   patchFetch: () => (/* binding */ patchFetch),\n/* harmony export */   requestAsyncStorage: () => (/* binding */ requestAsyncStorage),\n/* harmony export */   routeModule: () => (/* binding */ routeModule),\n/* harmony export */   serverHooks: () => (/* binding */ serverHooks),\n/* harmony export */   staticGenerationAsyncStorage: () => (/* binding */ staticGenerationAsyncStorage)\n/* harmony export */ });\n/* harmony import */ var next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/dist/server/future/route-modules/app-route/module.compiled */ \"(rsc)/../../node_modules/next/dist/server/future/route-modules/app-route/module.compiled.js\");\n/* harmony import */ var next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var next_dist_server_future_route_kind__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/dist/server/future/route-kind */ \"(rsc)/../../node_modules/next/dist/server/future/route-kind.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next/dist/server/lib/patch-fetch */ \"(rsc)/../../node_modules/next/dist/server/lib/patch-fetch.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var _Users_avishka_Documents_Zervtek_Inquiry_Pooler_apps_customer_portal_app_api_auth_nextauth_route_ts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./app/api/auth/[...nextauth]/route.ts */ \"(rsc)/./app/api/auth/[...nextauth]/route.ts\");\n\n\n\n\n// We inject the nextConfigOutput here so that we can use them in the route\n// module.\nconst nextConfigOutput = \"\"\nconst routeModule = new next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__.AppRouteRouteModule({\n    definition: {\n        kind: next_dist_server_future_route_kind__WEBPACK_IMPORTED_MODULE_1__.RouteKind.APP_ROUTE,\n        page: \"/api/auth/[...nextauth]/route\",\n        pathname: \"/api/auth/[...nextauth]\",\n        filename: \"route\",\n        bundlePath: \"app/api/auth/[...nextauth]/route\"\n    },\n    resolvedPagePath: \"/Users/avishka/Documents/Zervtek/Inquiry Pooler/apps/customer-portal/app/api/auth/[...nextauth]/route.ts\",\n    nextConfigOutput,\n    userland: _Users_avishka_Documents_Zervtek_Inquiry_Pooler_apps_customer_portal_app_api_auth_nextauth_route_ts__WEBPACK_IMPORTED_MODULE_3__\n});\n// Pull out the exports that we need to expose from the module. This should\n// be eliminated when we've moved the other routes to the new format. These\n// are used to hook into the route.\nconst { requestAsyncStorage, staticGenerationAsyncStorage, serverHooks } = routeModule;\nconst originalPathname = \"/api/auth/[...nextauth]/route\";\nfunction patchFetch() {\n    return (0,next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__.patchFetch)({\n        serverHooks,\n        staticGenerationAsyncStorage\n    });\n}\n\n\n//# sourceMappingURL=app-route.js.map//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi4vLi4vbm9kZV9tb2R1bGVzL25leHQvZGlzdC9idWlsZC93ZWJwYWNrL2xvYWRlcnMvbmV4dC1hcHAtbG9hZGVyLmpzP25hbWU9YXBwJTJGYXBpJTJGYXV0aCUyRiU1Qi4uLm5leHRhdXRoJTVEJTJGcm91dGUmcGFnZT0lMkZhcGklMkZhdXRoJTJGJTVCLi4ubmV4dGF1dGglNUQlMkZyb3V0ZSZhcHBQYXRocz0mcGFnZVBhdGg9cHJpdmF0ZS1uZXh0LWFwcC1kaXIlMkZhcGklMkZhdXRoJTJGJTVCLi4ubmV4dGF1dGglNUQlMkZyb3V0ZS50cyZhcHBEaXI9JTJGVXNlcnMlMkZhdmlzaGthJTJGRG9jdW1lbnRzJTJGWmVydnRlayUyRklucXVpcnklMjBQb29sZXIlMkZhcHBzJTJGY3VzdG9tZXItcG9ydGFsJTJGYXBwJnBhZ2VFeHRlbnNpb25zPXRzeCZwYWdlRXh0ZW5zaW9ucz10cyZwYWdlRXh0ZW5zaW9ucz1qc3gmcGFnZUV4dGVuc2lvbnM9anMmcm9vdERpcj0lMkZVc2VycyUyRmF2aXNoa2ElMkZEb2N1bWVudHMlMkZaZXJ2dGVrJTJGSW5xdWlyeSUyMFBvb2xlciUyRmFwcHMlMkZjdXN0b21lci1wb3J0YWwmaXNEZXY9dHJ1ZSZ0c2NvbmZpZ1BhdGg9dHNjb25maWcuanNvbiZiYXNlUGF0aD0mYXNzZXRQcmVmaXg9Jm5leHRDb25maWdPdXRwdXQ9JnByZWZlcnJlZFJlZ2lvbj0mbWlkZGxld2FyZUNvbmZpZz1lMzAlM0QhIiwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7OztBQUFzRztBQUN2QztBQUNjO0FBQ3dEO0FBQ3JJO0FBQ0E7QUFDQTtBQUNBLHdCQUF3QixnSEFBbUI7QUFDM0M7QUFDQSxjQUFjLHlFQUFTO0FBQ3ZCO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7QUFDQSxZQUFZO0FBQ1osQ0FBQztBQUNEO0FBQ0E7QUFDQTtBQUNBLFFBQVEsaUVBQWlFO0FBQ3pFO0FBQ0E7QUFDQSxXQUFXLDRFQUFXO0FBQ3RCO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDdUg7O0FBRXZIIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vY3VzdG9tZXItcG9ydGFsLz81YmQ2Il0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFwcFJvdXRlUm91dGVNb2R1bGUgfSBmcm9tIFwibmV4dC9kaXN0L3NlcnZlci9mdXR1cmUvcm91dGUtbW9kdWxlcy9hcHAtcm91dGUvbW9kdWxlLmNvbXBpbGVkXCI7XG5pbXBvcnQgeyBSb3V0ZUtpbmQgfSBmcm9tIFwibmV4dC9kaXN0L3NlcnZlci9mdXR1cmUvcm91dGUta2luZFwiO1xuaW1wb3J0IHsgcGF0Y2hGZXRjaCBhcyBfcGF0Y2hGZXRjaCB9IGZyb20gXCJuZXh0L2Rpc3Qvc2VydmVyL2xpYi9wYXRjaC1mZXRjaFwiO1xuaW1wb3J0ICogYXMgdXNlcmxhbmQgZnJvbSBcIi9Vc2Vycy9hdmlzaGthL0RvY3VtZW50cy9aZXJ2dGVrL0lucXVpcnkgUG9vbGVyL2FwcHMvY3VzdG9tZXItcG9ydGFsL2FwcC9hcGkvYXV0aC9bLi4ubmV4dGF1dGhdL3JvdXRlLnRzXCI7XG4vLyBXZSBpbmplY3QgdGhlIG5leHRDb25maWdPdXRwdXQgaGVyZSBzbyB0aGF0IHdlIGNhbiB1c2UgdGhlbSBpbiB0aGUgcm91dGVcbi8vIG1vZHVsZS5cbmNvbnN0IG5leHRDb25maWdPdXRwdXQgPSBcIlwiXG5jb25zdCByb3V0ZU1vZHVsZSA9IG5ldyBBcHBSb3V0ZVJvdXRlTW9kdWxlKHtcbiAgICBkZWZpbml0aW9uOiB7XG4gICAgICAgIGtpbmQ6IFJvdXRlS2luZC5BUFBfUk9VVEUsXG4gICAgICAgIHBhZ2U6IFwiL2FwaS9hdXRoL1suLi5uZXh0YXV0aF0vcm91dGVcIixcbiAgICAgICAgcGF0aG5hbWU6IFwiL2FwaS9hdXRoL1suLi5uZXh0YXV0aF1cIixcbiAgICAgICAgZmlsZW5hbWU6IFwicm91dGVcIixcbiAgICAgICAgYnVuZGxlUGF0aDogXCJhcHAvYXBpL2F1dGgvWy4uLm5leHRhdXRoXS9yb3V0ZVwiXG4gICAgfSxcbiAgICByZXNvbHZlZFBhZ2VQYXRoOiBcIi9Vc2Vycy9hdmlzaGthL0RvY3VtZW50cy9aZXJ2dGVrL0lucXVpcnkgUG9vbGVyL2FwcHMvY3VzdG9tZXItcG9ydGFsL2FwcC9hcGkvYXV0aC9bLi4ubmV4dGF1dGhdL3JvdXRlLnRzXCIsXG4gICAgbmV4dENvbmZpZ091dHB1dCxcbiAgICB1c2VybGFuZFxufSk7XG4vLyBQdWxsIG91dCB0aGUgZXhwb3J0cyB0aGF0IHdlIG5lZWQgdG8gZXhwb3NlIGZyb20gdGhlIG1vZHVsZS4gVGhpcyBzaG91bGRcbi8vIGJlIGVsaW1pbmF0ZWQgd2hlbiB3ZSd2ZSBtb3ZlZCB0aGUgb3RoZXIgcm91dGVzIHRvIHRoZSBuZXcgZm9ybWF0LiBUaGVzZVxuLy8gYXJlIHVzZWQgdG8gaG9vayBpbnRvIHRoZSByb3V0ZS5cbmNvbnN0IHsgcmVxdWVzdEFzeW5jU3RvcmFnZSwgc3RhdGljR2VuZXJhdGlvbkFzeW5jU3RvcmFnZSwgc2VydmVySG9va3MgfSA9IHJvdXRlTW9kdWxlO1xuY29uc3Qgb3JpZ2luYWxQYXRobmFtZSA9IFwiL2FwaS9hdXRoL1suLi5uZXh0YXV0aF0vcm91dGVcIjtcbmZ1bmN0aW9uIHBhdGNoRmV0Y2goKSB7XG4gICAgcmV0dXJuIF9wYXRjaEZldGNoKHtcbiAgICAgICAgc2VydmVySG9va3MsXG4gICAgICAgIHN0YXRpY0dlbmVyYXRpb25Bc3luY1N0b3JhZ2VcbiAgICB9KTtcbn1cbmV4cG9ydCB7IHJvdXRlTW9kdWxlLCByZXF1ZXN0QXN5bmNTdG9yYWdlLCBzdGF0aWNHZW5lcmF0aW9uQXN5bmNTdG9yYWdlLCBzZXJ2ZXJIb29rcywgb3JpZ2luYWxQYXRobmFtZSwgcGF0Y2hGZXRjaCwgIH07XG5cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWFwcC1yb3V0ZS5qcy5tYXAiXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/../../node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fauth%2F%5B...nextauth%5D%2Froute&page=%2Fapi%2Fauth%2F%5B...nextauth%5D%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fauth%2F%5B...nextauth%5D%2Froute.ts&appDir=%2FUsers%2Favishka%2FDocuments%2FZervtek%2FInquiry%20Pooler%2Fapps%2Fcustomer-portal%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Favishka%2FDocuments%2FZervtek%2FInquiry%20Pooler%2Fapps%2Fcustomer-portal&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!\n");

/***/ }),

/***/ "(rsc)/./app/api/auth/[...nextauth]/route.ts":
/*!*********************************************!*\
  !*** ./app/api/auth/[...nextauth]/route.ts ***!
  \*********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   GET: () => (/* binding */ handler),\n/* harmony export */   POST: () => (/* binding */ handler)\n/* harmony export */ });\n/* harmony import */ var next_auth__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next-auth */ \"(rsc)/./node_modules/next-auth/index.js\");\n/* harmony import */ var next_auth__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(next_auth__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var _lib_auth__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @/lib/auth */ \"(rsc)/./lib/auth.ts\");\n\n\nconst handler = next_auth__WEBPACK_IMPORTED_MODULE_0___default()(_lib_auth__WEBPACK_IMPORTED_MODULE_1__.authOptions);\n\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9hcHAvYXBpL2F1dGgvWy4uLm5leHRhdXRoXS9yb3V0ZS50cyIsIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUFpQztBQUNRO0FBRXpDLE1BQU1FLFVBQVVGLGdEQUFRQSxDQUFDQyxrREFBV0E7QUFFTyIsInNvdXJjZXMiOlsid2VicGFjazovL2N1c3RvbWVyLXBvcnRhbC8uL2FwcC9hcGkvYXV0aC9bLi4ubmV4dGF1dGhdL3JvdXRlLnRzP2M4YTQiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IE5leHRBdXRoIGZyb20gXCJuZXh0LWF1dGhcIjtcbmltcG9ydCB7IGF1dGhPcHRpb25zIH0gZnJvbSBcIkAvbGliL2F1dGhcIjtcblxuY29uc3QgaGFuZGxlciA9IE5leHRBdXRoKGF1dGhPcHRpb25zKTtcblxuZXhwb3J0IHsgaGFuZGxlciBhcyBHRVQsIGhhbmRsZXIgYXMgUE9TVCB9O1xuIl0sIm5hbWVzIjpbIk5leHRBdXRoIiwiYXV0aE9wdGlvbnMiLCJoYW5kbGVyIiwiR0VUIiwiUE9TVCJdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./app/api/auth/[...nextauth]/route.ts\n");

/***/ }),

/***/ "(rsc)/./lib/auth.ts":
/*!*********************!*\
  !*** ./lib/auth.ts ***!
  \*********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   authOptions: () => (/* binding */ authOptions)\n/* harmony export */ });\n/* harmony import */ var next_auth_providers_credentials__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next-auth/providers/credentials */ \"(rsc)/./node_modules/next-auth/providers/credentials.js\");\n/* harmony import */ var bcryptjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! bcryptjs */ \"(rsc)/../../node_modules/bcryptjs/index.js\");\n/* harmony import */ var _lib_db__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @/lib/db */ \"(rsc)/./lib/db.ts\");\n\n\n\nconst THIRTY_DAYS = 30 * 24 * 60 * 60;\nconst authOptions = {\n    providers: [\n        (0,next_auth_providers_credentials__WEBPACK_IMPORTED_MODULE_0__[\"default\"])({\n            name: \"credentials\",\n            credentials: {\n                email: {\n                    label: \"Email\",\n                    type: \"email\"\n                },\n                password: {\n                    label: \"Password\",\n                    type: \"password\"\n                }\n            },\n            async authorize (credentials) {\n                if (!credentials?.email || !credentials?.password) return null;\n                const email = credentials.email.trim().toLowerCase();\n                // Use raw SQL so we never depend on Prisma client schema (emailVerifiedAt, etc.)\n                const rows = await _lib_db__WEBPACK_IMPORTED_MODULE_2__.prisma.$queryRawUnsafe(`SELECT id, name, email, \"passwordHash\", \"emailVerifiedAt\"\n           FROM inquiry_pooler.\"Customer\"\n           WHERE LOWER(TRIM(email)) = $1\n           LIMIT 1`, email).catch((err)=>{\n                    console.error(\"[portal auth] DB query failed:\", err);\n                    return [];\n                });\n                const customer = rows[0];\n                if (!customer) return null;\n                if (!customer.passwordHash) return null;\n                const ok = await (0,bcryptjs__WEBPACK_IMPORTED_MODULE_1__.compare)(credentials.password, customer.passwordHash);\n                if (!ok) return null;\n                if (!customer.emailVerifiedAt) return null;\n                return {\n                    id: customer.id,\n                    email: customer.email ?? undefined,\n                    name: customer.name\n                };\n            }\n        })\n    ],\n    jwt: {\n        maxAge: THIRTY_DAYS\n    },\n    session: {\n        strategy: \"jwt\",\n        maxAge: THIRTY_DAYS,\n        updateAge: 7 * 24 * 60 * 60\n    },\n    cookies: {\n        sessionToken: {\n            name: process.env.NEXTAUTH_URL?.startsWith(\"https://\") ? \"__Secure-next-auth.session-token\" : \"next-auth.session-token\",\n            options: {\n                httpOnly: true,\n                sameSite: \"lax\",\n                path: \"/\",\n                maxAge: THIRTY_DAYS,\n                secure: process.env.NEXTAUTH_URL?.startsWith(\"https://\") ?? false\n            }\n        }\n    },\n    trustHost: true,\n    callbacks: {\n        jwt ({ token, user }) {\n            if (user) {\n                token.id = user.id;\n                token.email = user.email;\n                token.name = user.name;\n            }\n            return token;\n        },\n        session ({ session, token }) {\n            if (session.user) {\n                session.user.id = token.id;\n                session.user.email = token.email;\n                session.user.name = token.name;\n            }\n            return session;\n        }\n    },\n    pages: {\n        signIn: \"/login\"\n    }\n};\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9saWIvYXV0aC50cyIsIm1hcHBpbmdzIjoiOzs7Ozs7O0FBQ2tFO0FBQy9CO0FBQ0Q7QUFVbEMsTUFBTUcsY0FBYyxLQUFLLEtBQUssS0FBSztBQUU1QixNQUFNQyxjQUErQjtJQUMxQ0MsV0FBVztRQUNUTCwyRUFBbUJBLENBQUM7WUFDbEJNLE1BQU07WUFDTkMsYUFBYTtnQkFDWEMsT0FBTztvQkFBRUMsT0FBTztvQkFBU0MsTUFBTTtnQkFBUTtnQkFDdkNDLFVBQVU7b0JBQUVGLE9BQU87b0JBQVlDLE1BQU07Z0JBQVc7WUFDbEQ7WUFDQSxNQUFNRSxXQUFVTCxXQUFXO2dCQUN6QixJQUFJLENBQUNBLGFBQWFDLFNBQVMsQ0FBQ0QsYUFBYUksVUFBVSxPQUFPO2dCQUMxRCxNQUFNSCxRQUFRRCxZQUFZQyxLQUFLLENBQUNLLElBQUksR0FBR0MsV0FBVztnQkFDbEQsaUZBQWlGO2dCQUNqRixNQUFNQyxPQUFPLE1BQU1iLDJDQUFNQSxDQUFDYyxlQUFlLENBQ3ZDLENBQUM7OztrQkFHTyxDQUFDLEVBQ1RSLE9BQ0FTLEtBQUssQ0FBQyxDQUFDQztvQkFDUEMsUUFBUUMsS0FBSyxDQUFDLGtDQUFrQ0Y7b0JBQ2hELE9BQU8sRUFBRTtnQkFDWDtnQkFDQSxNQUFNRyxXQUFXTixJQUFJLENBQUMsRUFBRTtnQkFDeEIsSUFBSSxDQUFDTSxVQUFVLE9BQU87Z0JBQ3RCLElBQUksQ0FBQ0EsU0FBU0MsWUFBWSxFQUFFLE9BQU87Z0JBQ25DLE1BQU1DLEtBQUssTUFBTXRCLGlEQUFPQSxDQUFDTSxZQUFZSSxRQUFRLEVBQUVVLFNBQVNDLFlBQVk7Z0JBQ3BFLElBQUksQ0FBQ0MsSUFBSSxPQUFPO2dCQUNoQixJQUFJLENBQUNGLFNBQVNHLGVBQWUsRUFBRSxPQUFPO2dCQUN0QyxPQUFPO29CQUNMQyxJQUFJSixTQUFTSSxFQUFFO29CQUNmakIsT0FBT2EsU0FBU2IsS0FBSyxJQUFJa0I7b0JBQ3pCcEIsTUFBTWUsU0FBU2YsSUFBSTtnQkFDckI7WUFDRjtRQUNGO0tBQ0Q7SUFDRHFCLEtBQUs7UUFBRUMsUUFBUXpCO0lBQVk7SUFDM0IwQixTQUFTO1FBQ1BDLFVBQVU7UUFDVkYsUUFBUXpCO1FBQ1I0QixXQUFXLElBQUksS0FBSyxLQUFLO0lBQzNCO0lBQ0FDLFNBQVM7UUFDUEMsY0FBYztZQUNaM0IsTUFBTTRCLFFBQVFDLEdBQUcsQ0FBQ0MsWUFBWSxFQUFFQyxXQUFXLGNBQ3ZDLHFDQUNBO1lBQ0pDLFNBQVM7Z0JBQ1BDLFVBQVU7Z0JBQ1ZDLFVBQVU7Z0JBQ1ZDLE1BQU07Z0JBQ05iLFFBQVF6QjtnQkFDUnVDLFFBQVFSLFFBQVFDLEdBQUcsQ0FBQ0MsWUFBWSxFQUFFQyxXQUFXLGVBQWU7WUFDOUQ7UUFDRjtJQUNGO0lBQ0FNLFdBQVc7SUFDWEMsV0FBVztRQUNUakIsS0FBSSxFQUFFa0IsS0FBSyxFQUFFQyxJQUFJLEVBQUU7WUFDakIsSUFBSUEsTUFBTTtnQkFDUkQsTUFBTXBCLEVBQUUsR0FBR3FCLEtBQUtyQixFQUFFO2dCQUNsQm9CLE1BQU1yQyxLQUFLLEdBQUdzQyxLQUFLdEMsS0FBSztnQkFDeEJxQyxNQUFNdkMsSUFBSSxHQUFHd0MsS0FBS3hDLElBQUk7WUFDeEI7WUFDQSxPQUFPdUM7UUFDVDtRQUNBaEIsU0FBUSxFQUFFQSxPQUFPLEVBQUVnQixLQUFLLEVBQUU7WUFDeEIsSUFBSWhCLFFBQVFpQixJQUFJLEVBQUU7Z0JBQ2hCakIsUUFBUWlCLElBQUksQ0FBQ3JCLEVBQUUsR0FBR29CLE1BQU1wQixFQUFFO2dCQUMxQkksUUFBUWlCLElBQUksQ0FBQ3RDLEtBQUssR0FBR3FDLE1BQU1yQyxLQUFLO2dCQUNoQ3FCLFFBQVFpQixJQUFJLENBQUN4QyxJQUFJLEdBQUd1QyxNQUFNdkMsSUFBSTtZQUNoQztZQUNBLE9BQU91QjtRQUNUO0lBQ0Y7SUFDQWtCLE9BQU87UUFDTEMsUUFBUTtJQUNWO0FBQ0YsRUFBRSIsInNvdXJjZXMiOlsid2VicGFjazovL2N1c3RvbWVyLXBvcnRhbC8uL2xpYi9hdXRoLnRzP2JmN2UiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHR5cGUgeyBOZXh0QXV0aE9wdGlvbnMgfSBmcm9tIFwibmV4dC1hdXRoXCI7XG5pbXBvcnQgQ3JlZGVudGlhbHNQcm92aWRlciBmcm9tIFwibmV4dC1hdXRoL3Byb3ZpZGVycy9jcmVkZW50aWFsc1wiO1xuaW1wb3J0IHsgY29tcGFyZSB9IGZyb20gXCJiY3J5cHRqc1wiO1xuaW1wb3J0IHsgcHJpc21hIH0gZnJvbSBcIkAvbGliL2RiXCI7XG5cbnR5cGUgQ3VzdG9tZXJSb3cgPSB7XG4gIGlkOiBzdHJpbmc7XG4gIG5hbWU6IHN0cmluZztcbiAgZW1haWw6IHN0cmluZyB8IG51bGw7XG4gIHBhc3N3b3JkSGFzaDogc3RyaW5nIHwgbnVsbDtcbiAgZW1haWxWZXJpZmllZEF0OiBEYXRlIHwgbnVsbDtcbn07XG5cbmNvbnN0IFRISVJUWV9EQVlTID0gMzAgKiAyNCAqIDYwICogNjA7XG5cbmV4cG9ydCBjb25zdCBhdXRoT3B0aW9uczogTmV4dEF1dGhPcHRpb25zID0ge1xuICBwcm92aWRlcnM6IFtcbiAgICBDcmVkZW50aWFsc1Byb3ZpZGVyKHtcbiAgICAgIG5hbWU6IFwiY3JlZGVudGlhbHNcIixcbiAgICAgIGNyZWRlbnRpYWxzOiB7XG4gICAgICAgIGVtYWlsOiB7IGxhYmVsOiBcIkVtYWlsXCIsIHR5cGU6IFwiZW1haWxcIiB9LFxuICAgICAgICBwYXNzd29yZDogeyBsYWJlbDogXCJQYXNzd29yZFwiLCB0eXBlOiBcInBhc3N3b3JkXCIgfSxcbiAgICAgIH0sXG4gICAgICBhc3luYyBhdXRob3JpemUoY3JlZGVudGlhbHMpIHtcbiAgICAgICAgaWYgKCFjcmVkZW50aWFscz8uZW1haWwgfHwgIWNyZWRlbnRpYWxzPy5wYXNzd29yZCkgcmV0dXJuIG51bGw7XG4gICAgICAgIGNvbnN0IGVtYWlsID0gY3JlZGVudGlhbHMuZW1haWwudHJpbSgpLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgIC8vIFVzZSByYXcgU1FMIHNvIHdlIG5ldmVyIGRlcGVuZCBvbiBQcmlzbWEgY2xpZW50IHNjaGVtYSAoZW1haWxWZXJpZmllZEF0LCBldGMuKVxuICAgICAgICBjb25zdCByb3dzID0gYXdhaXQgcHJpc21hLiRxdWVyeVJhd1Vuc2FmZTxDdXN0b21lclJvd1tdPihcbiAgICAgICAgICBgU0VMRUNUIGlkLCBuYW1lLCBlbWFpbCwgXCJwYXNzd29yZEhhc2hcIiwgXCJlbWFpbFZlcmlmaWVkQXRcIlxuICAgICAgICAgICBGUk9NIGlucXVpcnlfcG9vbGVyLlwiQ3VzdG9tZXJcIlxuICAgICAgICAgICBXSEVSRSBMT1dFUihUUklNKGVtYWlsKSkgPSAkMVxuICAgICAgICAgICBMSU1JVCAxYCxcbiAgICAgICAgICBlbWFpbFxuICAgICAgICApLmNhdGNoKChlcnIpID0+IHtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKFwiW3BvcnRhbCBhdXRoXSBEQiBxdWVyeSBmYWlsZWQ6XCIsIGVycik7XG4gICAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgICB9KTtcbiAgICAgICAgY29uc3QgY3VzdG9tZXIgPSByb3dzWzBdO1xuICAgICAgICBpZiAoIWN1c3RvbWVyKSByZXR1cm4gbnVsbDtcbiAgICAgICAgaWYgKCFjdXN0b21lci5wYXNzd29yZEhhc2gpIHJldHVybiBudWxsO1xuICAgICAgICBjb25zdCBvayA9IGF3YWl0IGNvbXBhcmUoY3JlZGVudGlhbHMucGFzc3dvcmQsIGN1c3RvbWVyLnBhc3N3b3JkSGFzaCk7XG4gICAgICAgIGlmICghb2spIHJldHVybiBudWxsO1xuICAgICAgICBpZiAoIWN1c3RvbWVyLmVtYWlsVmVyaWZpZWRBdCkgcmV0dXJuIG51bGw7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgaWQ6IGN1c3RvbWVyLmlkLFxuICAgICAgICAgIGVtYWlsOiBjdXN0b21lci5lbWFpbCA/PyB1bmRlZmluZWQsXG4gICAgICAgICAgbmFtZTogY3VzdG9tZXIubmFtZSxcbiAgICAgICAgfTtcbiAgICAgIH0sXG4gICAgfSksXG4gIF0sXG4gIGp3dDogeyBtYXhBZ2U6IFRISVJUWV9EQVlTIH0sXG4gIHNlc3Npb246IHtcbiAgICBzdHJhdGVneTogXCJqd3RcIixcbiAgICBtYXhBZ2U6IFRISVJUWV9EQVlTLFxuICAgIHVwZGF0ZUFnZTogNyAqIDI0ICogNjAgKiA2MCwgLy8gcmVmcmVzaCBzZXNzaW9uIGV2ZXJ5IDcgZGF5cyAod2FzIDI0aDsgbGVzcyBmcmVxdWVudCA9IGZld2VyIHVuZXhwZWN0ZWQgbG9nb3V0cylcbiAgfSxcbiAgY29va2llczoge1xuICAgIHNlc3Npb25Ub2tlbjoge1xuICAgICAgbmFtZTogcHJvY2Vzcy5lbnYuTkVYVEFVVEhfVVJMPy5zdGFydHNXaXRoKFwiaHR0cHM6Ly9cIilcbiAgICAgICAgPyBcIl9fU2VjdXJlLW5leHQtYXV0aC5zZXNzaW9uLXRva2VuXCJcbiAgICAgICAgOiBcIm5leHQtYXV0aC5zZXNzaW9uLXRva2VuXCIsXG4gICAgICBvcHRpb25zOiB7XG4gICAgICAgIGh0dHBPbmx5OiB0cnVlLFxuICAgICAgICBzYW1lU2l0ZTogXCJsYXhcIixcbiAgICAgICAgcGF0aDogXCIvXCIsXG4gICAgICAgIG1heEFnZTogVEhJUlRZX0RBWVMsXG4gICAgICAgIHNlY3VyZTogcHJvY2Vzcy5lbnYuTkVYVEFVVEhfVVJMPy5zdGFydHNXaXRoKFwiaHR0cHM6Ly9cIikgPz8gZmFsc2UsXG4gICAgICB9LFxuICAgIH0sXG4gIH0sXG4gIHRydXN0SG9zdDogdHJ1ZSxcbiAgY2FsbGJhY2tzOiB7XG4gICAgand0KHsgdG9rZW4sIHVzZXIgfSkge1xuICAgICAgaWYgKHVzZXIpIHtcbiAgICAgICAgdG9rZW4uaWQgPSB1c2VyLmlkO1xuICAgICAgICB0b2tlbi5lbWFpbCA9IHVzZXIuZW1haWw7XG4gICAgICAgIHRva2VuLm5hbWUgPSB1c2VyLm5hbWU7XG4gICAgICB9XG4gICAgICByZXR1cm4gdG9rZW47XG4gICAgfSxcbiAgICBzZXNzaW9uKHsgc2Vzc2lvbiwgdG9rZW4gfSkge1xuICAgICAgaWYgKHNlc3Npb24udXNlcikge1xuICAgICAgICBzZXNzaW9uLnVzZXIuaWQgPSB0b2tlbi5pZCBhcyBzdHJpbmc7XG4gICAgICAgIHNlc3Npb24udXNlci5lbWFpbCA9IHRva2VuLmVtYWlsIGFzIHN0cmluZztcbiAgICAgICAgc2Vzc2lvbi51c2VyLm5hbWUgPSB0b2tlbi5uYW1lIGFzIHN0cmluZztcbiAgICAgIH1cbiAgICAgIHJldHVybiBzZXNzaW9uO1xuICAgIH0sXG4gIH0sXG4gIHBhZ2VzOiB7XG4gICAgc2lnbkluOiBcIi9sb2dpblwiLFxuICB9LFxufTtcbiJdLCJuYW1lcyI6WyJDcmVkZW50aWFsc1Byb3ZpZGVyIiwiY29tcGFyZSIsInByaXNtYSIsIlRISVJUWV9EQVlTIiwiYXV0aE9wdGlvbnMiLCJwcm92aWRlcnMiLCJuYW1lIiwiY3JlZGVudGlhbHMiLCJlbWFpbCIsImxhYmVsIiwidHlwZSIsInBhc3N3b3JkIiwiYXV0aG9yaXplIiwidHJpbSIsInRvTG93ZXJDYXNlIiwicm93cyIsIiRxdWVyeVJhd1Vuc2FmZSIsImNhdGNoIiwiZXJyIiwiY29uc29sZSIsImVycm9yIiwiY3VzdG9tZXIiLCJwYXNzd29yZEhhc2giLCJvayIsImVtYWlsVmVyaWZpZWRBdCIsImlkIiwidW5kZWZpbmVkIiwiand0IiwibWF4QWdlIiwic2Vzc2lvbiIsInN0cmF0ZWd5IiwidXBkYXRlQWdlIiwiY29va2llcyIsInNlc3Npb25Ub2tlbiIsInByb2Nlc3MiLCJlbnYiLCJORVhUQVVUSF9VUkwiLCJzdGFydHNXaXRoIiwib3B0aW9ucyIsImh0dHBPbmx5Iiwic2FtZVNpdGUiLCJwYXRoIiwic2VjdXJlIiwidHJ1c3RIb3N0IiwiY2FsbGJhY2tzIiwidG9rZW4iLCJ1c2VyIiwicGFnZXMiLCJzaWduSW4iXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/./lib/auth.ts\n");

/***/ }),

/***/ "(rsc)/./lib/db.ts":
/*!*******************!*\
  !*** ./lib/db.ts ***!
  \*******************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   prisma: () => (/* reexport safe */ _inquiry_pooler_db__WEBPACK_IMPORTED_MODULE_0__.prisma)\n/* harmony export */ });\n/* harmony import */ var _inquiry_pooler_db__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @inquiry-pooler/db */ \"(rsc)/../../packages/db/src/index.ts\");\n\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9saWIvZGIudHMiLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBNEMiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9jdXN0b21lci1wb3J0YWwvLi9saWIvZGIudHM/MWRmMCJdLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgeyBwcmlzbWEgfSBmcm9tIFwiQGlucXVpcnktcG9vbGVyL2RiXCI7XG4iXSwibmFtZXMiOlsicHJpc21hIl0sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(rsc)/./lib/db.ts\n");

/***/ }),

/***/ "(rsc)/../../packages/db/src/index.ts":
/*!**************************************!*\
  !*** ../../packages/db/src/index.ts ***!
  \**************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   PrismaClient: () => (/* reexport safe */ _prisma_client__WEBPACK_IMPORTED_MODULE_0__.PrismaClient),\n/* harmony export */   prisma: () => (/* binding */ prisma)\n/* harmony export */ });\n/* harmony import */ var _prisma_client__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @prisma/client */ \"@prisma/client\");\n/* harmony import */ var _prisma_client__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_prisma_client__WEBPACK_IMPORTED_MODULE_0__);\n\nconst globalForPrisma = globalThis;\nconst isPlaceholderUrl = process.env.DATABASE_URL?.includes(\"placeholder\") ?? false;\nconst prisma = globalForPrisma.prisma ?? new _prisma_client__WEBPACK_IMPORTED_MODULE_0__.PrismaClient({\n    log:  true ? [\n        \"error\",\n        \"warn\"\n    ] : 0\n});\nif (!isPlaceholderUrl) {\n    if (true) {\n        globalForPrisma.prisma = prisma;\n    } else {}\n}\n\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi4vLi4vcGFja2FnZXMvZGIvc3JjL2luZGV4LnRzIiwibWFwcGluZ3MiOiI7Ozs7Ozs7QUFBOEM7QUFFOUMsTUFBTUMsa0JBQWtCQztBQUV4QixNQUFNQyxtQkFDSkMsUUFBUUMsR0FBRyxDQUFDQyxZQUFZLEVBQUVDLFNBQVMsa0JBQWtCO0FBRWhELE1BQU1DLFNBQ1hQLGdCQUFnQk8sTUFBTSxJQUN0QixJQUFJUix3REFBWUEsQ0FBQztJQUNmUyxLQUNFTCxLQUFzQyxHQUFHO1FBQUM7UUFBUztLQUFPLEdBQUcsQ0FBUztBQUMxRSxHQUFHO0FBRUwsSUFBSSxDQUFDRCxrQkFBa0I7SUFDckIsSUFBSUMsSUFBcUMsRUFBRTtRQUN6Q0gsZ0JBQWdCTyxNQUFNLEdBQUdBO0lBQzNCLE9BQU8sRUFJTjtBQUNIO0FBRXdCIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vY3VzdG9tZXItcG9ydGFsLy4uLy4uL3BhY2thZ2VzL2RiL3NyYy9pbmRleC50cz82YTA3Il0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFByaXNtYUNsaWVudCB9IGZyb20gXCJAcHJpc21hL2NsaWVudFwiO1xuXG5jb25zdCBnbG9iYWxGb3JQcmlzbWEgPSBnbG9iYWxUaGlzIGFzIHVua25vd24gYXMgeyBwcmlzbWE6IFByaXNtYUNsaWVudCB8IHVuZGVmaW5lZCB9O1xuXG5jb25zdCBpc1BsYWNlaG9sZGVyVXJsID1cbiAgcHJvY2Vzcy5lbnYuREFUQUJBU0VfVVJMPy5pbmNsdWRlcyhcInBsYWNlaG9sZGVyXCIpID8/IGZhbHNlO1xuXG5leHBvcnQgY29uc3QgcHJpc21hID1cbiAgZ2xvYmFsRm9yUHJpc21hLnByaXNtYSA/P1xuICBuZXcgUHJpc21hQ2xpZW50KHtcbiAgICBsb2c6XG4gICAgICBwcm9jZXNzLmVudi5OT0RFX0VOViA9PT0gXCJkZXZlbG9wbWVudFwiID8gW1wiZXJyb3JcIiwgXCJ3YXJuXCJdIDogW1wiZXJyb3JcIl0sXG4gIH0pO1xuXG5pZiAoIWlzUGxhY2Vob2xkZXJVcmwpIHtcbiAgaWYgKHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSBcInByb2R1Y3Rpb25cIikge1xuICAgIGdsb2JhbEZvclByaXNtYS5wcmlzbWEgPSBwcmlzbWE7XG4gIH0gZWxzZSB7XG4gICAgcHJpc21hLiRjb25uZWN0KCkuY2F0Y2goKGVycikgPT4ge1xuICAgICAgY29uc29sZS5lcnJvcihcIkZhaWxlZCB0byBjb25uZWN0IHRvIGRhdGFiYXNlOlwiLCBlcnIpO1xuICAgIH0pO1xuICB9XG59XG5cbmV4cG9ydCB7IFByaXNtYUNsaWVudCB9O1xuZXhwb3J0IHR5cGUgKiBmcm9tIFwiQHByaXNtYS9jbGllbnRcIjtcbiJdLCJuYW1lcyI6WyJQcmlzbWFDbGllbnQiLCJnbG9iYWxGb3JQcmlzbWEiLCJnbG9iYWxUaGlzIiwiaXNQbGFjZWhvbGRlclVybCIsInByb2Nlc3MiLCJlbnYiLCJEQVRBQkFTRV9VUkwiLCJpbmNsdWRlcyIsInByaXNtYSIsImxvZyIsIiRjb25uZWN0IiwiY2F0Y2giLCJlcnIiLCJjb25zb2xlIiwiZXJyb3IiXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/../../packages/db/src/index.ts\n");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../../../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/next","vendor-chunks/next-auth","vendor-chunks/@babel","vendor-chunks/jose","vendor-chunks/openid-client","vendor-chunks/bcryptjs","vendor-chunks/oauth","vendor-chunks/object-hash","vendor-chunks/preact","vendor-chunks/uuid","vendor-chunks/yallist","vendor-chunks/preact-render-to-string","vendor-chunks/lru-cache","vendor-chunks/cookie","vendor-chunks/oidc-token-hash","vendor-chunks/@panva"], () => (__webpack_exec__("(rsc)/../../node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fauth%2F%5B...nextauth%5D%2Froute&page=%2Fapi%2Fauth%2F%5B...nextauth%5D%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fauth%2F%5B...nextauth%5D%2Froute.ts&appDir=%2FUsers%2Favishka%2FDocuments%2FZervtek%2FInquiry%20Pooler%2Fapps%2Fcustomer-portal%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Favishka%2FDocuments%2FZervtek%2FInquiry%20Pooler%2Fapps%2Fcustomer-portal&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!")));
module.exports = __webpack_exports__;

})();