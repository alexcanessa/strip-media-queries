module.exports = function(grunt) {
    grunt.loadNpmTasks('grunt-eslint');

    grunt.initConfig({
        eslint: {
            options: {
                fix: true
            },
            target: [
                'Gruntfile.js',
                'src/**/*.js'
            ]
        }
    });

    grunt.registerTask('test', ['eslint']);
};
