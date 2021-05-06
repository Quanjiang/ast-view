#!/usr/bin/python
# -*- coding: utf8 -*-
#

import ast
import json
import os
import argparse


def dedupe_nodes(l):
    new_list = []
    ids_collected = []
    for i in l:
        if i["id"] not in ids_collected:
            new_list.append(i)
            ids_collected.append(i["id"])
    return new_list


def node_properties(node):
    d = {}
    for field, value in ast.iter_fields(node):
        if isinstance(value, ast.AST):
            d[field] = node_properties(value)
        elif (
            isinstance(value, list) and len(value) > 0 and isinstance(value[0], ast.AST)
        ):
            d[field] = [node_properties(v) for v in value]
        else:
            d[field] = value
    return d

def node_to_dict(node, parent):
    i = []
    children = list(ast.iter_child_nodes(node))
    if len(children) > 0:
        for n in children:
            i.extend(node_to_dict(n, node))

    d = node_properties(node)
    if hasattr(node, "lineno"):
        d["lineno"] = node.lineno
    i.append(
        {
            "id": str(id(node)),
            "label": type(node).__name__,
            "parent": id(parent),
            "fileds": {
                "lineno": d['lineno'] if 'lineno' in d else -1,
                "pos": -1,
                "end": -1,
                "type": type(node).__name__,
            }
            # "data": json.dumps(d, skipkeys=True),
        }
    )
    return i


def deal_file(file_path):
    with open(file_path, 'r') as rh:
        context = rh.read()
    tree = ast.parse(context)
    nodes = node_to_dict(tree, None)
    return dedupe_nodes(nodes)


def main():
    parser = argparse.ArgumentParser(description='py2ast json')
    parser.add_argument('code_path', help="代码所在路径",  nargs='+')
    args = parser.parse_args()
    

    for ii in  args.code_path:
        print(json.dumps(deal_file(ii)))
    
    
if __name__ == '__main__':
    main()
    