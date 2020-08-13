import minify from "rollup-plugin-babel-minify";

export default [
    {
        input: "src/pledge.js",
        output: [
            {
                file: "dist/pledge.cjs.js",
                format: "cjs"
            },
            {
                file: "dist/pledge.js",
                format: "esm"
            }
        ]
    },
    {
        input: "src/pledge.js",
        plugins: [minify({
            comments: false
        })],
        output: {
            file: "dist/pledge.min.js",
            format: "esm"
        }
    }    
];
