# AST-view

![](https://ast-view.gallerycdn.vsassets.io/extensions/ast-view/72003873)


AST View display the ast of code file.

1. open the code file by vscode 
2. keyboard: `command + shift +p` (mac) call command panel
3. Just input  `ShowASTView` into command panel


## Features

Show AST View of current code file.

- support: golang, python
- click node can jump to code line

## Requirements

-  Golang (go-ast command required)
   -  `go get github.com/tamayika/go-ast` 
-  python2+ (python3 best)

## Release Notes

### 0.0.3
- Add Logo

### 0.0.2 
- Add go line jump support
- Add python2 support

### 0.0.1 
- First release

## Credits 

This package bundles some 3rd party javascript libraries. All libraries are bundled in the package so that the WebUI doesn't need to make any requests to the internet to protect the privacy of your code.

- [json2html](https://json2html.com/)
- [json2html-visualizer](http://visualizer.json2html.com/)
- [visjs](http://visjs.org/)
- [instaviz](https://github.com/tonybaloney/instaviz)
