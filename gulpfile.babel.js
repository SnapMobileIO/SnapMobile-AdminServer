'use strict';

import gulp from 'gulp';
import sass from 'gulp-ruby-sass';
import browserify from 'browserify';
import source from 'vinyl-source-stream';
import nodemon from 'gulp-nodemon';
import babel from 'gulp-babel';
import del from 'del';
import gutil from 'gulp-util';
import mocha from 'gulp-mocha';
import jsdoc from 'gulp-jsdoc3';
import cssimport from 'gulp-cssimport';
import jscs from 'gulp-jscs';

function handleError(error) {
  gutil.log(gutil.colors.magenta(error.message));
  if (error.stack) { gutil.log(gutil.colors.cyan(error.stack)); }
  process.exit(1);
}

gulp.task('babel', function() {
  return gulp.src(['./src/admin/**/*.js', './src/admin/*'])
    .pipe(babel({ presets: ['es2015'] }))
    .pipe(gulp.dest('./dist/admin'))
    .on('error', handleError);
});

gulp.task('server-html', function() {
  return gulp.src(['./server/**/*.html', '!./server/test/*'])
    .pipe(gulp.dest('dist/server'))
    .on('error', handleError);
});

gulp.task('start', function() {
  nodemon({
    script: 'snapmobile-admin.js',
    exec: 'npm run babel-node',
    ext: 'js html',
    env: { NODE_ENV: 'development' }
  });
});

gulp.task('prod', function() {
  nodemon({
    script: 'snapmobile-admin.js',
    exec: 'npm run babel-node',
    ext: 'js html',
    env: { NODE_ENV: 'production' }
  });
});

gulp.task('test-server', function() {
  nodemon({
    script: './snapmobile-admin.js',
    exec: 'npm run babel-node',
    ext: 'js html',
    env: { NODE_ENV: 'test' }
  });
});

gulp.task('jscs', function() {
  return gulp.src(['./server/**/*.js',
                   './client/**/*.js',
                   '!./client/assets/js/*'])
    .pipe(jscs())
    .pipe(jscs.reporter());
});

/**
 * Mocha tests
 *
 * TODO: Mocha task need to wait for build to complete
 * Until then...
 * To test run:
 *    gulp build
 *    gulp mocha
 */
gulp.task('mocha', function() {
  return gulp.src(['./server/**/*.{spec,integration}.js',
                    './test/**/*.{spec,integration}.js',
                    './client/**/*.{spec,integration}.js'])
    .pipe(mocha())
    .once('end', function() {
      process.exit();
    })
    .on('error', handleError);
});

gulp.task('set-test-node-env', function() {
    return process.env.NODE_ENV = 'test';
  });

gulp.task('browserify', function() {
  return browserify('./src/admin/index.js')
    .transform('babelify', { presets: ['es2015'] })
    .bundle()
    .pipe(source('main.js'))
    .pipe(gulp.dest('./client/assets/js/'))
    .on('error', handleError);
});

gulp.task('client-dist', function() {
  return gulp.src('./client/**/*')
    .pipe(gulp.dest('./dist/client'))
    .on('error', handleError);
});

gulp.task('sass', function() {
  return sass('./client/assets/scss/styles.scss')
    .pipe(gulp.dest('./client/assets/css'))
    .on('error', handleError);
});

gulp.task('fonts-fontawesome', function() {
  return gulp.src('node_modules/font-awesome/fonts/*')
    .pipe(gulp.dest('./client/assets/fonts/fontawesome/'));
});

gulp.task('fonts-bootstrap', function() {
  return gulp.src('node_modules/bootstrap-sass/assets/fonts/**/*')
    .pipe(gulp.dest('./client/assets/fonts/'));
});

gulp.task('clean', function() {
  return del(['./dist']);
});

gulp.task('doc', function() {
  return gulp.src(['./server/**/*.js', './client/app/**/*.js'], { read: false })
    .pipe(jsdoc())
    .on('error', handleError);
});

gulp.task('watch', function() {
  gulp.watch(['./client/**/*.js', '!./client/assets/js/*'], ['browserify']);
  gulp.watch(['./client/assets/scss/*.scss', '!./client/assets/css/*'], ['sass']);
});

gulp.task('fonts', ['fonts-bootstrap', 'fonts-fontawesome']);
gulp.task('test', ['set-test-node-env', 'mocha']);
gulp.task('default', ['watch']);
gulp.task('dev', ['fonts', 'watch', 'start']);
gulp.task('build', ['browserify', 'fonts', 'sass', 'babel', 'client-dist', 'server-html']);
gulp.task('dist', ['babel']);