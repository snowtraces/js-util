window.$ = (function (window, $) {
    const mdParser = function (mdText) {
        let result = {}
        let result_list = []
        let script_list = []
        result.post = result_list
        result.script = script_list

        let flag_newLine = true;
        let line_idx = -1;
        let char_idx = -1;
        let first_not_blank_char = null;
        let last_char = null;
        // 每行非空字符开始索引
        let start_idx = [];

        let pair_stack = [];
        let data_stack = [];
        let last_pair_idx = -1;

        let pair_chars = ['`'];
        let on_text_block = false;
        let paragraph_cache = '';


        for (const c of mdText) {
            // 新行初始化
            if (flag_newLine) {
                line_idx++;
                char_idx == -1;
                start_idx[line_idx] = -1;
                first_not_blank_char = null;

                last_pair_idx = -1;
            }
            char_idx++;

            // 查找第一个非空字符
            if (!first_not_blank_char && !/\s/.test(c)) {
                first_not_blank_char = c;
                start_idx[line_idx] = char_idx;
            }

            // 压栈
            if (pair_chars.includes(c)) {
                // 命中 pair
                if (last_pair_idx === -1) {
                    pair_stack.push(c);
                } else {
                    // 如果是连续的
                    if (last_pair_idx + 1 === char_idx) {
                        let last_pair = pair_stack.pop()
                        if (last_char === c) {
                            // 和上一个字符相同，合并pair
                            pair_stack.push(last_pair + c);
                        } else {
                            // // 和上一个字符不相同，重新压入
                            pair_stack.push(last_pair)
                            pair_stack.push(c)
                        }
                    } else {
                        pair_stack.push(c);
                    }
                }

                last_pair_idx = char_idx;
            } else {
                // 非pair
                if (last_pair_idx + 1 == char_idx) {
                    // 相邻字符
                    if (pair_stack.length >= 2) {
                        // 判断pair是否成组
                        let pair_1 = pair_stack.pop()
                        let pair_2 = pair_stack.pop()

                        if (pair_1 === pair_2) {
                            if (on_text_block && pair_1 === '```') {
                                on_text_block = false;
                            }

                            // 数据出栈
                            let poped_data = popStack(data_stack, pair_1, on_text_block)
                            data_seg = poped_data.data
                            if (poped_data.type === 'meta') {
                                result.meta = data_seg
                            } else {
                                if (poped_data.type === 'exec' && poped_data.script) {
                                    script_list.push(...poped_data.script)
                                }
                                if (!on_text_block) {
                                    if (pair_1 === '```') {
                                        // 本文块结束
                                        result_list.push(`${(paragraph_cache + data_seg).trim()}`)
                                        paragraph_cache = '';

                                    } else {
                                        // 普通文本（段落模式）
                                        if (c && c === '\n') {
                                            // 换行
                                            result_list.push(`<p>${(paragraph_cache + data_seg).trim()}</p>`)
                                            paragraph_cache = '';
                                        } else {
                                            paragraph_cache += data_seg;
                                        }
                                    }
                                } else {
                                    // 文本块中
                                    paragraph_cache += data_seg;
                                }
                            }
                            data_stack = [];
                        }
                    } else if (pair_stack.length === 1) {
                        on_text_block = pair_stack[0] === '```'

                        // 孤pair 数据出栈
                        let poped_data = popStack(data_stack)
                        data_seg = poped_data.data
                        if (poped_data.type === 'meta') {
                            result.meta = data_seg
                        } else {
                            if (data_seg && data_seg.startsWith('# ')) {
                                $.log('一级标题', data_seg)
                            } else {
                                if (!on_text_block) {
                                    // 普通文本（段落模式）
                                    if (c && c === '\n') {
                                        // 换行
                                        result_list.push(`<p>${(paragraph_cache + data_seg).trim()}</p>`)
                                        paragraph_cache = '';
                                    } else {
                                        paragraph_cache += data_seg;
                                    }
                                } else {
                                    // 普通文本结束
                                    result_list.push(`<p>${(paragraph_cache + data_seg).trim()}</p>`)
                                    paragraph_cache = '';
                                }
                            }
                        }
                        data_stack = []
                    }
                }
                // 数据入栈
                data_stack.push(c)
            }
            // 新行状态切换
            flag_newLine = c && c === '\n'
            last_char = c
        }

        // 结束处理
        if (pair_stack.length >= 2) {
            // 判断pair是否成组
            let pair_1 = pair_stack.pop()
            let pair_2 = pair_stack.pop()

            if (pair_1 === pair_2) {
                if (on_text_block) {
                    on_text_block = pair_1 !== '```'
                }

                // 数据出栈
                let poped_data = popStack(data_stack, pair_1)
                data_seg = poped_data.data

                if (poped_data.type === 'meta') {
                    result.meta = data_seg
                } else {
                    if (poped_data.type === 'exec' && poped_data.script) {
                        script_list.push(...poped_data.script)
                    }
                    if (!on_text_block) {
                        // 段落模式
                        result_list.push(`<p>${paragraph_cache + data_seg}</p>`)
                        paragraph_cache = '';
                    } else {
                        // 文本块
                        paragraph_cache += data_seg;
                    }
                }
                data_stack = []
            }
        } else {
            // 数据出栈
            let poped_data = popStack(data_stack)
            data_seg = poped_data.data
            if (poped_data.type === 'meta') {
                result.meta = data_seg
            } else {
                // 段落模式
                result_list.push(`<p>${paragraph_cache + data_seg}</p>`)
                paragraph_cache = '';
            }
            data_stack = []
        }

        return result;
    }

    const popStack = function (data_stack, pair, plainText) {
        let result = {}
        let text = data_stack.join('');
        if (plainText || !pair) {
            if (!text) {
                return text;
            }
            // 超链接
            text = text.replace(/\[([^\]]+)\]\(([^\)]+)\)/, '<a title="$1" href="$2" target="_blank">$1</a>')
            // 标题
            if (text.indexOf('## ') !== -1) {
                text = text.replace(/(\n|^)## ([^\n]*)(\n|$)/g, '</p><h2>$2</h2><p>')
            }
            if (text.indexOf('## ') !== -1) {
                text = text.replace(/(\n|^)### ([^\n]*)(\n|$)/g, '</p><h3>$2</h3><p>')
            }

            result.data = text
            result.type = 'text'
            return result
        } else {
            if (pair === '`') {
                result.data = `<code>${text}</code>`
                result.type = 'text'
                return result
            } else if (pair === '```') {
                // 文本块
                let firstLineIdx = data_stack.indexOf('\n')
                let type = data_stack.slice(0, firstLineIdx).join('').trim()
                text = data_stack.slice(firstLineIdx + 1).join('')

                if (type === 'meta') {
                    // 解析meta信息
                    return {
                        data: metaParser(text),
                        type: 'meta'
                    }
                } else if (type === 'exec') {
                    if (/<script\s+src=[\"\']([^\"\']+)[\"\']+/.test(text)) {
                        let scriptSrc = /<script\s+src=[\"\']([^\"\']+)[\"\']+/.exec(text)[1]
                        result.script = [scriptSrc]
                    }
                    result.data = text;
                    result.type = 'exec';
                    return result;
                } else {
                    result.type = 'block'
                    result.data = `<pre class="line-numbers language-${type}"><code class="language-${type}">${text.trim()}</code></pre>`
                    return result
                }
            }
        }
    }

    const metaParser = function (metaText) {
        let lineList = metaText.split('\n');
        let regexedList = lineList
            .filter(line => !/^\s*$/.test(line))
            .map(line => /^(\s*)([^\s:]+):?\s*(.*)/.exec(line));

        let meta = {}
        let offsex_off_array = 1;
        regexedList.forEach((matched, idx) => {
            let title = matched[2]
            if (title === '-') {
                let lastTitle = regexedList[idx - offsex_off_array][2];
                meta[lastTitle] = meta[lastTitle] || []
                meta[lastTitle].push(matched[3])
                offsex_off_array++;
            } else {
                meta[title] = matched[3]
                offsex_off_array = 1
            }
        });
        return meta;
    }

    const func = {
        mdParser: mdParser,
    }
    for (const _func in func) {
        $[_func] = func[_func]
        window[_func] = func[_func]
    }
    return $
})(window, window.$ || {})
