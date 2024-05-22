export default {
    "presets": [
        [
            "@babel/preset-env",
            {
                "targets": {
                    "esmodules": true
                },
                "modules": "auto",
                "exclude": [
                    // ES 2015
                    "transform-arrow-functions",
                    "transform-classes",
                    "transform-template-literals",
                    "transform-function-name",
                    // ES2017
                    "transform-async-to-generator",
                    // ES2022
                    "transform-class-properties",
                    "transform-class-static-block",
                    "transform-private-property-in-object",
                    "transform-private-methods"
                ]
            }
        ]
    ],
    "plugins": []
}
