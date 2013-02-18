#!/usr/bin/env node

var fs = require('fs');
var dot = require('dot');

var ugly = require("uglify-js");
var program = require('commander');


program
.version('0.0.1')
.usage('dot-packer')
.option('-d, --dir [value]', 'Target directory <path>')
.option('-l, --list [value]', 'List of paths')
.option('-e, --encoding [value]', 'file encoding to be used (in and out). can be ascii or utf8. defaults to utf8.')
.option('-o, --output [value]', 'Output file <path>', "jst.js")
.option('-n, --ns [value]', 'The GLOBAL variable to pack the templates in',"JST")
.parse(process.argv);


if (!program.list){
    console.log("The target directory path is required. -h for help");
}
else  {

    try {

        var files;

        var code = program.ns + "= function(){ return new Function();};";
        var file = null;


        var data = fs.readFileSync(program.list, 'utf8');
        var folders = JSON.parse(data).folders;

        console.log(folders);
        console.log(folders.length);

        for (var i in folders) {
            code += readFilesFromDir(folders[i]);
        }

        var ast = ugly.parse(code); // parse code and get the initial AST
        ast.figure_out_scope();
        var compressed=ast.transform(ugly.Compressor());
        compressed.figure_out_scope();
        compressed.compute_char_frequency();
        compressed.mangle_names();
        var final_code = compressed.print_to_string(); // compressed code here

        fs.writeFileSync(program.output,final_code, program.encoding);
    }

    catch(err) {
        dumpError(err);
    }
}

function readFilesFromDir(dirname) {
    var files = fs.readdirSync(dirname),
    code = '';

    for (i in files) {
        if (files[i].match(/^[^\.]*\.jst/g)) {
            console.log("Processing:" + files[i]);
            code += convert(dirname,files[i],program.ns)+"\r\n";
        }
    }

    return code;
}

function convert(dir,fileName, namespace){
    var path = dir + fileName;
    var data = fs.readFileSync(path, program.encoding);
    var code = dot.template(data).toString();
    var header = namespace+"['"+dir+fileName.replace('.jst','')+"'] = function(it)";
    code = code.replace('function anonymous(it)', header)+";";
    return code;
}

function dumpError(err) {
    if (typeof err === 'object') {
        if (err.message) {
            console.log('\nMessage: ' + err.message)
        }
        if (err.stack) {
            console.log('\nStacktrace:')
            console.log('====================')
            console.log(err.stack);
        }
    } else {
        console.log('dumpError :: argument is not an object');
    }
}


