/*global module:false*/
module.exports = function (grunt) {
    'use strict';

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        uglify: {
            dist: {
                files: {
                    'dist/<%= pkg.name.toLowerCase() %>.min.js': 'dist/<%= pkg.name.toLowerCase() %>.js'
                }
            }
        },
        jshint: {
            options: {
                // Uncommented are default grunt options
                bitwise: true, //Added from site
                curly: true,
                eqeqeq: true,
                immed: true,
                latedef: true,
                newcap: true,
                noarg: true,
                noempty: true, //Added from site
                nonew: true, //Added
                quotmark: 'single', //Added
                /* regexp: true, */
                undef: true,
                unused: true, //Added from site
                /* strict: true, //Added from site */
                sub: true,
                boss: true, //dont' allow assignments to be evaluated as truthy/falsey */
                eqnull: true, //Allow == null
                browser: true,
                /* indent: 4, //Added from site */
                devel: true, //Added
                white: false,
                onecase: true,
                trailing: true,
                maxparams: 6,
                maxdepth: 9,
                maxerr: 20
            },
            globals: {
                ActiveXObject: false
            },
            lint: {
                src: './dist/<%= pkg.name.toLowerCase() %>.js'
            }
        },
        concat: {
            options: {
                banner: '(function(window, document){\n',
                footer: '})(window, document);'
            },
            dist: {
                files: {
                    'dist/<%= pkg.name.toLowerCase() %>.js': ['src/helpers.js', 'src/trace.js', 'src/report.js'],
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-concat');

    grunt.registerTask('default', ['concat', 'jshint:lint', 'uglify']);
    grunt.registerTask('travis', ['concat', 'jshint:lint', 'uglify']);
};
