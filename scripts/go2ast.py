#!/usr/bin/python3
# -*- coding: utf8 -*-
#
#

import json
import os
import argparse

import sys, subprocess
import os 



def get_cwd():
    return os.path.dirname(__file__)
    
def run_command(command, check_status=True, block=True,cwd=None):
    # logger and logger.info("run command: '%s'", command)
    # print_log("[RUN]: {}".format(command))
    if not block:
        subprocess.Popen(command, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE,cwd=cwd,encoding='utf8')
        return

    errors = []
    stdout = ""
    status = ""
    try:
        p = subprocess.Popen(command, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE,cwd=cwd ) #,encoding='utf8')
        stdout, stderr = p.communicate()
        status = p.returncode
        if check_status and status != 0:
            errors.append((command, str(status), stderr))

        if not stderr is None and len(stderr) > 0:
            stdout = stderr
            errors.append((command, str(status), stderr))
    except:
        errors.append((command, "", str(sys.exc_info())))
        stdout += str(errors)
        # raise RuntimeError('\n'.join(errors))
    return status,stdout


def deal_file(file_path):
    cmd = "go-ast {}".format(file_path)
    rtc, rtn = run_command(cmd)
    if rtc != 0:
        print("Run CMD: {} Failed: {}".format(cmd, str(rtn)))
        exit(rtc)
    go_ast_obj = json.loads(rtn)


    accumulate_line = 0
    line_word_cnt = []
    line_word_accumulate = []
    with open(file_path, 'rb') as rh:
        context = rh.read()
        total_line = len(context)
        for line in context.split(b'\n'):
            cnt_line = len(line) + 1
            accumulate_line += cnt_line
            if accumulate_line > total_line:
                break
            line_word_cnt.append(cnt_line)
            line_word_accumulate.append(accumulate_line)
    def _get_line(pos,end):
        # use stupid method
        line_num = -1 
        col_num = -1
        for i in range(0, len(line_word_accumulate)):
            if line_word_accumulate[i] < pos:
                continue
            else:
                line_num = i
                break
        if line_num > 0:
            col_num = pos - line_word_accumulate[line_num - 1]
        else:
            col_num = pos
        return line_num + 1, col_num

    def _deal_obj(obj):
        obj['lineno'], obj['colno'] = _get_line(obj['pos'],obj['end'])
        for ii in obj['children']:
            _deal_obj(ii)
    _deal_obj(go_ast_obj)

    return go_ast_obj
    





def main():
    parser = argparse.ArgumentParser(description='go2ast json with line Num')
    parser.add_argument('code_path', help="代码所在路径",  nargs='+')
    args = parser.parse_args()

    for ii in  args.code_path:
        print(json.dumps(deal_file(ii)))
    
    
if __name__ == '__main__':
    main()
    