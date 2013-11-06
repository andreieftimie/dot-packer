#!/usr/bin/env node

(function () {
    "use strict";

    var fs = require('fs');
    var path = require('path');
    var dot = require('dot');
    var ugly = require("uglify-js");
    var program = require('commander');

    program
    .version('0.2.0')
    .usage('dot-packer')
    .option('-e, --extension [value]', 'File extension to be used. Defaults to dot.')
    .option('-d, --dir [value]', 'Target directory <path>')
    .option('-l, --list [value]', 'List of paths')
    .option('-c, --encoding [value]', 'file encoding to be used (in and out). can be ascii or utf8. defaults to utf8.')
    .option('-o, --output [value]', 'Output file <path>', "jst.js")
    .option('-N, --NS [value]', 'The GLOBAL variable to pack the templates in',"JST")
    .option('-n, --ns [value]', 'The LOCAL variable to append to the templates name',"")
    .parse(process.argv);

    function getExtension(filename) {
        var ext = path.extname(filename||'').split('.');
        return ext[ext.length - 1];
    }

    function walk(dir, done) {

        var results = [],
        extension = program.extension || 'dot';

        fs.readdir(dir, function(err, list) {
            if ( err ) {
                return done(err);
            }
            var pending = list.length;
            if ( !pending ){
                return done(null, results);
            }
            list.forEach(function(file) {
                file = path.resolve(dir, file);
                fs.stat(file, function(err, stat) {
                    if (stat && stat.isDirectory()) {
                        walk(file, function(err, res) {
                            results = results.concat(res);
                            if (!--pending) {
                                done(null, results);
                            }
                        });
                    } else {
                        if ( getExtension(file) === extension ) {
                            results.push(file);
                        }
                        if (!--pending) {
                            done(null, results);
                        }
                    }
                });
            });
        });
        return results;
    }

    if ( program.dir ) {
        try {
            walk(program.dir, function (err, results) {
                var i, l, v, temp = '';

                if ( err ) {
                    throw err;
                }

                for ( i = 0, l = results.length; i < l; i ++) {
                    v = results[i];
                    temp += convert(v);
                }

                console.log('\nuglifying ' + results.length + 'templates.');

                uglityToFile(temp);
            });
        } catch (e) {
            dumpError(e);
        }
    }

    function uglityToFile (data) {
        var ast, compressed, output;

        ast = ugly.parse(data); // parse output and get the initial AST
        ast.figure_out_scope();

        compressed=ast.transform(ugly.Compressor());
        compressed.figure_out_scope();
        compressed.compute_char_frequency();
        compressed.mangle_names();

        output = compressed.print_to_string(); // compressed output here

        fs.writeFileSync(program.output, output, program.encoding);
    }

    function convert(path){
        var data, output, header, realPathOfDir;
        
        path = fs.realpathSync(path);
        
        data = fs.readFileSync(path, program.encoding);
        output = dot.template(data).toString();;
        realPathOfDir = fs.realpathSync(program.dir);

        path = path.replace(realPathOfDir,"");
        path = path.replace('.jst','');
        
        if(program.ns){
            path = program.ns + path;
        }

        header = program.NS + "['" + path + "'] = function(it)";

        output = output.replace('function anonymous(it)', header)+";";
        return output;
    }

    function dumpError(err) {

        console.log('\nDOT PACKER:');

        if (typeof err === 'object') {
            if (err.message) {
                console.log('\nMessage: ');
                console.log('\n====================\n');
                console.log(err.message);
            }
            if (err.stack) {
                console.log('\nStacktrace:');
                console.log('\n====================\n');
                console.log(err.stack);
            }
        } else {
            console.log('cannot provide usefull information');
        }
    }
}());
