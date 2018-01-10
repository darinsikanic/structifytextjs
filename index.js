const _isPlainObject = require('lodash.isplainobject');

parse = (text, struct) => {
    if(typeof text === 'string' || text instanceof String) {
        const arrayOfLines = text.match(/[^\r\n]+/g); 
        return parseStruct(arrayOfLines, struct)
    }
    return null
}

parseStruct = (lines, struct) => {
    let parsed = {}
    for(const [k, v] of Object.entries(struct)) {
        if(Array.isArray(v) && !(typeof v === 'string' || v instanceof String) && v.length > 0){
            parsed[k] = _parseList(k, v, lines)
        } else if(_isPlainObject(v)) {
            parsed[k] = _parseDict(v, lines)
        } else {
            if(k != 'block_start' && k != 'block_end') {
                parsed[k] = _parseRegex(lines, k, v)
            }
        }
    }
    return parsed
}

_parseList = (key, value, lines) => {
    if(_isPlainObject(value[0])) {
        return _parseDict(value[0], lines, return_list=true)
    } else {
        return _parseRegex(lines, key, value[0], return_list=true)
    }
}

_parseDict = (value, lines, return_list=false) => {
    if('block_start' in value || 'id' in value) {
        const chunks = _chunkLines(lines, value)
        if(chunks) {
            const parsed = chunks.map(chunk => parseStruct(chunk, value))
            return return_list ? parsed : parsed[0]
        }
        return null
    }
    return parseStruct(lines, value)
}

_chunkLines = (lines, struct) => {
    if(!('id' in struct) && !('block_start' in struct)) {
        throw new Error("'id' or 'block_start' key is required in a list containing a dictionary")
    }
    const id = 'block_start' in struct ? struct['block_start'] : struct['id']
    const id_regex = _compileRegex('id', id)
    const matches = lines.filter(line => line.match(id_regex))
    if (matches.length === 0) {
        return null
    }
    const match_indexes = _indexOfMatches(matches, lines)
    let force_block_end_index = -1
    if ('block_end' in struct) {
        const block_end_regex = _compileRegex('block_end', struct['block_end'])
        const block_end_matches = lines.filter(line => line.match(block_end_regex))
        if (block_end_matches.length > 0) {
            const block_end_indexes = _indexOfMatches(block_end_matches, lines)
            force_block_end_index = block_end_indexes.filter(i => i > match_indexes[0]).shift()
        } else {
            console.warn("The block_end regular expression does not find a match")
        }
    }
    return _doChunkLines(lines, match_indexes, force_block_end_index)
}

_doChunkLines = (lines, match_indexes, force_block_end_index=-1) => {
    const chunks = []
    if (force_block_end_index >= 0) {
        return [lines.slice(match_indexes[0], force_block_end_index)]
    }
    for (const [idx, val] of match_indexes.entries()) {
        if(idx+1 >= match_indexes.length) {
            chunks.push(lines.slice(val))
        } else if (val <= match_indexes[match_indexes.length-1]) {
            if (match_indexes[idx + 1] >= match_indexes[match_indexes.length-1]) {
                chunks.push(lines.slice(val, match_indexes[match_indexes.length-1]))
            } else {
                chunks.push(lines.slice(val, match_indexes[idx+1]))
            }
        }
    }
    return chunks
}

_parseRegex = (lines, key, regex, return_list=false) => {
    const cregex = _compileRegex(key, regex)
    if (_regexGroups(cregex) < 1) {
        throw new Error(`he regular expression at key '${key}' must contain a regex group (...)`)
    } else if (_regexGroups(cregex) > 1) {
        console.warn(`The regular expression at key '${key}' should contain only one regex group`)
    }
    let values = []
    for (const l of lines) {
        let matches = _findAll(cregex, l)
        if (matches.length > 0) {
            for (const match of matches) {
                values.push(match)
            }
        }
    }
    if (values.length > 0 && !return_list) {
        return values[0]
    }
    return values.length > 0 ? values : null
}

_indexOfMatches = (matches, lines) => {
    return Array.from(new Set(matches.map(x => lines.indexOf(x)))).sort((a, b) => a - b)
}

_compileRegex = (key, regex) => {
    if (!(typeof regex === 'string' || regex instanceof String)) {
        throw new Error(`The value at key '${key}' must be a regular expression string`)
    }
    const {cregex, flags} = _inlineFlags(regex)
    return new RegExp(cregex, flags)
}

_findAll = (regex, s) => {
    // const regex = new RegExp(regexObj, regexObj.flags + 'g');
    const matches = s.match(regex)
    return matches ? matches.slice(1) : []
}

_regexGroups = (regex) => {
    return (regex.source.match(/\(.+?\)/g) || []).length
}

_inlineFlags = (regexString) => {
    let flags = ""
    const cregex = regexString.replace(/^\(\?([g,i,m,u,y]{1,})\)/, (match, p1, offset, string) => {
        flags = p1
        return ""
    })
    return {flags, cregex}
}

module.exports = {
    parse,
    parseStruct,
    _parseList,
    _parseDict,
    _chunkLines,
    _doChunkLines,
    _parseRegex,
    _indexOfMatches,
    _compileRegex,
    _findAll,
}