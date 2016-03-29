var gulp = require('gulp');
var $ = require('gulp-load-plugins')();
var crisper = require('gulp-crisper');

// Lint JavaScript files
gulp.task('lint', function() {
  return gulp.src([
      '**/*.js',
      '**/*.html',
      '!node_modules/**/*.*'
    ])
    // JSCS has not yet a extract option
    .pipe($.if('*.html', $.htmlExtract({
      strip: true
    })))
    .pipe($.jshint())
    .pipe($.jscs())
    .pipe($.jscsStylish.combineWithHintResults())
    .pipe($.jshint.reporter('jshint-stylish'))
    .pipe($.jshint.reporter('fail'));
});
/**
 * Make all bower_components CSP ready
 */
gulp.task('crisper-bower', function() {
  gulp.src('bower_components/**/*.html')
    .pipe(crisper({
      scriptInHead: false,
      onlySplit: false,
      alwaysWriteScript: false
    }))
    .pipe(gulp.dest('bower_components/'));
});
