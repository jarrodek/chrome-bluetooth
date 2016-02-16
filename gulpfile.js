var gulp = require('gulp');
var $ = require('gulp-load-plugins')();

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
