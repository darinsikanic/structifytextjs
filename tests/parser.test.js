const parser = require('../index')
const mockChunkyData = jest.fn()

mockChunkyData.mockReturnValue(`
Some Identifiable Chunk Start:
Some chunk content 1
Some more chunk content 1
Some Other Identifiable Chunk Start:
Some chunk content 2
Some more chunk content 2`)

test('can compile regex', () => {
    expect(parser._compileRegex('message', '(\\S+)').source).toEqual((new RegExp('(\\S+)').source))
})

test('value not regex string raises error', () => {
    const badRegexInt = () => parser._compileRegex('message', 123)
    const badRegexList = () => parser._compileRegex('message', ['(\\S+)'])
    const badRegexCompiled = () => parser._compileRegex('message', new RegExp('(\\S+)'))
    expect(badRegexInt).toThrowError()
    expect(badRegexList).toThrowError()
    expect(badRegexCompiled).toThrowError()
})

test('parse index of matches', () => {
    const lines = ['a', 'b', 'c', 'c', 'c']
    const matches = lines.filter(line => line.match(new RegExp('a|c')))
    expect(parser._indexOfMatches(matches, lines)).toEqual([0,2])
}) 

test('parse regex expect string', () => {
    const lines = ["Hello","World"]
    expect(parser._parseRegex(lines, 'somekey', '(World)')).toEqual('World')
}) 

test('parse regex force list', () => {
    const lines = ["Hello","World"]
    expect(parser._parseRegex(lines, 'somekey', '(World)', return_list=true)).toEqual(['World'])
}) 

test('parse regex expect list', () => {
    const lines = ["Hello", "World", "world"]
    expect(parser._parseRegex(lines, 'somekey', '(?i)(World)', return_list=true)).toEqual(['World', "world"])
})  

test('parse regex expect null', () => {
    const lines = ["Hello", "World", "world"]
    expect(parser._parseRegex(lines, 'somekey', '(?i)(Cheese)', return_list=true)).toBeNull()
})

test('value without group raises error', () => {
    const lines = ["Hello", "World"]
    const badRegex = () => parser._parseRegex(lines, 'somekey', 'World')
    expect(badRegex).toThrowError()
})

test('value with two groups raises warning', () => {
    const lines = ["Hello", "World"]
    const spy = jest.spyOn(global.console, 'warn')
    parser._parseRegex(lines, 'somekey', '(.*)\\S+(.*)')
    expect(spy).toHaveBeenCalled()
    spy.mockReset()
    spy.mockRestore()
})

test('do chunk lines force', () => {
    const lines = mockChunkyData().match(/[^\r\n]+/g)
    const match_indexes = [0,3]
    const expected_chunks = [lines.slice(0,3), lines.slice(3)]
    expect(parser._doChunkLines(lines, match_indexes)).toEqual(expected_chunks)
})

test('do chunk lines force block end', () => {
    const lines = mockChunkyData().match(/[^\r\n]+/g)
    const match_indexes = [0,3]
    const force_block_end_index = 4
    const expected_chunks = [lines.slice(0,4)]
    expect(parser._doChunkLines(lines, match_indexes, force_block_end_index)).toEqual(expected_chunks)
})

test('chunk lines by id', () => {
    const lines = mockChunkyData().match(/[^\r\n]+/g)
    const struct = {'id': '(Chunk\\sStart)'}
    const expected_chunks = [lines.slice(0,3), lines.slice(3)]
    expect(parser._chunkLines(lines, struct)).toEqual(expected_chunks)
})

test('chunk lines by id', () => {
    const lines = mockChunkyData().match(/[^\r\n]+/g)
    const struct = {'id': '(Chunk\\sStart)'}
    const expected_chunks = [lines.slice(0,3), lines.slice(3)]
    expect(parser._chunkLines(lines, struct)).toEqual(expected_chunks)
})


test('chunk lines by block start', () => {
    const lines = mockChunkyData().match(/[^\r\n]+/g)
    const struct = {'block_start': '(Chunk\\sStart)'}
    const expected_chunks = [lines.slice(0,3), lines.slice(3)]
    expect(parser._chunkLines(lines, struct)).toEqual(expected_chunks)
})

test('chunk lines force break end', () => {
    const lines = mockChunkyData().match(/[^\r\n]+/g)
    const struct = {'block_start': '(Chunk\\sStart)', 'block_end': '(chunk content 2)'}
    const expected_chunks = [lines.slice(0,4)]
    expect(parser._chunkLines(lines, struct)).toEqual(expected_chunks)
})

test('chunk lines no match returns null', () => {
    const lines = mockChunkyData().match(/[^\r\n]+/g)
    struct = {'block_start': '(Elephant)'}
    expect(parser._chunkLines(lines, struct)).toBeNull()
})

test('chunk lines no id or block start raises exception', () => {
    const lines = mockChunkyData().match(/[^\r\n]+/g)
    struct = {'yo': '(Chunk\\sStart)'}
    const chunkBadStruct = () => parser._chunkLines(lines, struct)
    expect(chunkBadStruct).toThrowError()
})

test('chunk lines no id or block start raises exception', () => {
    const lines = mockChunkyData().match(/[^\r\n]+/g)
    struct = {'yo': '(Chunk\\sStart)'}
    const chunkBadStruct = () => parser._chunkLines(lines, struct)
    expect(chunkBadStruct).toThrowError()
})

test('chunk lines no block end match generates warning', () => {
    const lines = mockChunkyData().match(/[^\r\n]+/g)
    const struct = {'block_start': '(Chunk\\sStart)', 'block_end': '(Elephant)'}
    const expected_chunks = [lines.slice(0,3), lines.slice(3)]
    const spy = jest.spyOn(global.console, 'warn')
    const chunks = parser._chunkLines(lines, struct)
    expect(spy).toHaveBeenCalled()
    expect(chunks).toEqual(expected_chunks)
    spy.mockReset()
    spy.mockRestore()
})

test('parse simple dictionary', () => {
    const lines = ['The','value is: 10']
    const struct = {'somekey': "value\\sis:\\s(\\d+)"}
    expect(parser._parseDict(struct, lines)).toEqual({'somekey': '10'})
})

test('parse dictionary with id', () => {
    const lines = mockChunkyData().match(/[^\r\n]+/g);
    const struct = {'id': '(Chunk\\sStart)', 'content_no': 'Some\\schunk\\scontent\\s(\\d)'}
    expect(parser._parseDict(struct, lines)).toEqual({'id': 'Chunk Start', 'content_no': '1'})
})

test('parse dictionary with block start', () => {
    const lines = mockChunkyData().match(/[^\r\n]+/g);
    const struct = {'block_start': '(Chunk\\sStart)', 'content_no': 'Some\\schunk\\scontent\\s(\\d)'}
    expect(parser._parseDict(struct, lines)).toEqual({'content_no': '1'})
})

test('parse dictionary that returns list', () => {
    const lines = mockChunkyData().match(/[^\r\n]+/g);
    const struct = {'block_start': '(Chunk\\sStart)', 'content_no': 'Some\\schunk\\scontent\\s(\\d)'}
    expect(parser._parseDict(struct, lines, return_list=true)).toEqual([{'content_no': '1'}, {'content_no': '2'}])
})

test('parse dictionary that returns null', () => {
    const lines = mockChunkyData().match(/[^\r\n]+/g);
    const struct = {'block_start': '(Chunk\\sEnd)', 'content_no': 'Some\\schunk\\scontent\\s(\\d)'}
    expect(parser._parseDict(struct, lines)).toBeNull()
})

test('parse simple list', () => {
    lines = ["The count says: 1", "The count says: 2", "The count says: 3",
             "The count says: 4", "The count says: 5"]
    const struct = {'block_start': '(Chunk\\sEnd)', 'content_no': 'Some\\schunk\\scontent\\s(\\d)'}
    expect(parser._parseList('count', ['(\\d)'], lines)).toEqual(['1', '2', '3', '4', '5'])
})

test('parse list with dictionary', () => {
    lines = ["The count says: 1", "The count says: 2", "The count says: 3",
             "The count says: 4", "The count says: 5"]
    const struct = [{'id': '(\\d)'}]
    expect(parser._parseList('id', struct, lines)).toEqual([{'id': '1'}, {'id': '2'}, {'id': '3'}, {'id': '4'}, {'id': '5'}])
})

test('parse list returns null', () => {
    lines = ["The count says: 1", "The count says: 2", "The count says: 3",
             "The count says: 4", "The count says: 5"]
    expect(parser._parseList('count', ['(elephant)'], lines)).toBeNull()
    expect(parser._parseList('id', [{'id': '(elephant)'}], lines)).toBeNull()
})