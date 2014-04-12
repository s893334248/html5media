"use strict";

var meta = require("./package.json");
var path = require("path");
var gulp = require("gulp");
var uglify = require("gulp-uglify");
var rename = require("gulp-rename");
var concat = require("gulp-concat");
var clean = require("gulp-clean");
var inject = require("gulp-inject");
var minifyCSS = require("gulp-minify-css");
var awspublish = require("gulp-awspublish");
var replace = require("gulp-replace");


var API_JS_BUILD_ROOT = path.join("build", "api", meta.version);


// Cleaning.

gulp.task("clean", function() {
    return gulp.src([
        "build"
    ], {
        "read": false
    })
    .pipe(clean());
});


// Building.

gulp.task("api-js", function() {
    return gulp.src([
        "src/lib/flowplayer/flowplayer.js",
        "src/lib/domready/domready.js",
        "src/api/html5media.js"
    ])
    .pipe(concat("html5media.js"))
    .pipe(gulp.dest(API_JS_BUILD_ROOT))
    .pipe(uglify())
    .pipe(rename("html5media.min.js"))
    .pipe(gulp.dest(API_JS_BUILD_ROOT));
});


gulp.task("api-swf", function() {
    return gulp.src([
        "src/lib/flowplayer/flowplayer.swf",
        "src/lib/flowplayer/flowplayer.controls.swf",
        "src/lib/flowplayer.audio/flowplayer.audio.swf",
        "src/lib/swfobject/expressInstall.swf"
    ])
    .pipe(gulp.dest(API_JS_BUILD_ROOT));
});


gulp.task("api-license", function() {
    return gulp.src([
        "LICENSE",
    ])
    .pipe(gulp.dest(API_JS_BUILD_ROOT));
});


gulp.task("api", ["api-js", "api-swf", "api-license"]);


gulp.task("media-css", function() {
    return gulp.src([
        "src/media/styles.css"
    ])
    .pipe(gulp.dest("build/media"))
    .pipe(minifyCSS({
        compatibility: "ie8"
    }))
    .pipe(rename("styles.min.css"))
    .pipe(gulp.dest("build/media"));
});


gulp.task("media-static", function() {
    return gulp.src([
        "src/media/*",
        "!src/media/*.css",
    ])
    .pipe(gulp.dest("build/media"));
});


gulp.task("media", ["media-static", "media-css"]);


function injectHtml(stream)  {
    return stream
    .pipe(inject(gulp.src([
        path.join(API_JS_BUILD_ROOT, "html5media.min.js")
    ], {
        read: false
    }), {
        ignorePath: "/build/api",
        addRootSlash: false,
        addPrefix: "http://api.html5media.info"
    }))
    .pipe(inject(gulp.src([
        "build/media/styles.min.css"
    ], {
        read: false
    }), {
        ignorePath: "/build/media",
        addRootSlash: false,
        addPrefix: "http://media.html5media.info"
    }))
    .pipe(replace(/\.\.\/media\//g, "http://media.html5media.info/"));
}


gulp.task("www-html", ["api"], function() {
    return injectHtml(gulp.src([
        "src/www/*.html"
    ]))
    .pipe(gulp.dest("build/www"));
});


gulp.task("www", ["www-html"]);


gulp.task("common-misc", function() {
    return gulp.src([
        "src/common/*.txt",
        "src/common/*.xml"
    ])
    .pipe(gulp.dest("build/api"))
    .pipe(gulp.dest("build/media"))
    .pipe(gulp.dest("build/www"));
});


gulp.task("common-html", ["api"], function() {
    return injectHtml(gulp.src([
        "src/common/*.html"
    ]))
    .pipe(gulp.dest("build/api"))
    .pipe(gulp.dest("build/media"))
    .pipe(gulp.dest("build/www"));
});


gulp.task("common", ["common-misc", "common-html"]);


gulp.task("build", ["api", "media", "www", "common"]);


// Distributing.

gulp.task("dist", ["build"], function() {
    return gulp.src([
        "build/**",
    ])
    .pipe(gulp.dest("dist/"));
});


// Publishing.

function publishToBucket(stream, bucketName) {
    var publisher = awspublish.create({
        key: process.env.HTML5MEDIA_AWS_ACCESS_KEY_ID,
        secret: process.env.HTML5MEDIA_AWS_SECRET_ACCESS_KEY,
        bucket: bucketName
    });
    return stream
    .pipe(publisher.publish({
        "Cache-Control": "public, max-age=315360000"
    }))
    .pipe(publisher.sync())
    .pipe(publisher.cache())
    .pipe(awspublish.reporter());
}


gulp.task("publish-www", ["dist"], function() {
    return publishToBucket(gulp.src([
        "dist/www/**"
    ]), "html5media.info");
});


gulp.task("publish-media", ["dist"], function() {
    return publishToBucket(gulp.src([
        "dist/media/**"
    ]), "media.html5media.info");
});


gulp.task("publish-api", ["dist"], function() {
    return publishToBucket(gulp.src([
        "dist/api/**"
    ]), "api.html5media.info");
});


gulp.task("publish", ["publish-www", "publish-media", "publish-api"]);
