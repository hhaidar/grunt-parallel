/*
 * grunt-parallel
 * https://github.com/iammerrick/grunt-parallel
 *
 * Copyright (c) 2013 Merrick Christensen
 * Licensed under the MIT license.
 */
/*jshint es5:true*/
module.exports = function(grunt) {
  var Promise = require('bluebird');
  var lpad = require('lpad');
  var throat = require('throat');

  function spawn(task) {
    return new Promise(function(resolve, reject) {
      grunt.util.spawn(task, function(error, result, code) {
        grunt.log.writeln();
        lpad.stdout('    ');

        if (error || code !== 0) {
          var message = result.stderr || result.stdout;

          grunt.log.error(message);
          lpad.stdout();

          return reject();
        }

        grunt.log.writeln(result);
        lpad.stdout();

        resolve();
      });
    });
  }

  grunt.registerMultiTask('parallel', 'Run sub-tasks in parallel.', function() {
    var done = this.async();
    var options = this.options({
      concurrency: 0,
      grunt: false,
      stream: false
    });
    var flags = grunt.option.flags();

    // If the configuration specifies that the task is a grunt task. Make it so.
    if (options.grunt === true) {
      this.data.tasks = this.data.tasks.map(function(task) {
        return {
          args: [task],
          grunt: true
        }
      });
    }

    // Normalize tasks config.
    this.data.tasks = this.data.tasks.map(function(task) {

      // Default to grunt it a command isn't specified
      if ( ! task.cmd ) {
        task.grunt = true;
      }

      // Pipe to the parent stdout when streaming.
      if ( task.stream || ( task.stream === undefined && options.stream ) ) {
        task.opts = task.opts || {};
        task.opts.stdio = 'inherit';
      }

      return task;
    });

    // Allow any flags to be passed to spawned tasks
    // This includes the verbose flag as well as any custom task flags
    this.data.tasks.forEach(function ( task ) {
      if ( task.grunt ) {
        flags.forEach(function ( flag ) {
          task.args.push( flag );
        });
      }
    });

    var concurrencyOptions;
    if (options.concurrency) {
      concurrencyOptions = {
        concurrency: options.concurrency
      };
    }
    Promise.map(this.data.tasks, spawn, concurrencyOptions).then(done, done.bind(this, false));

  });
};
