const parser = require('../index')
const fs = require('fs')
const path = require('path')
const mockFlowsStruct = jest.fn()
const mockFlowsParsed = jest.fn()
const mockGroupsStruct = jest.fn()
const mockGroupsParsed = jest.fn()

mockFlowsStruct.mockReturnValue(
    require("./structures/flows-struct.json")
)
mockFlowsParsed.mockReturnValue(
    require("./output_parsed/flow-output-parsed.json")
)

mockGroupsStruct.mockReturnValue(
    require("./structures/groups-struct.json")
)
mockGroupsParsed.mockReturnValue(
    require("./output_parsed/group-output-parsed.json")
)

test('simple struct', () => {
    const struct = { 'message': '(.*)' }
    const lines = ["Hello World"]
    expect(parser.parseStruct(lines, struct)).toEqual({ 'message': "Hello World" })
})

test('simple list', () => {
    const struct = { 'count': ['(\\d)'] }
    const lines = ["The count says: 1", "The count says: 2", "The count says: 3",
    "The count says: 4", "The count says: 5"]
    expect(parser.parseStruct(lines, struct)).toEqual({ 'count': ["1","2","3","4","5"] })
})

test('flows', () => {
    const struct = mockFlowsStruct()
    const output =  fs.readFileSync(path.resolve(__dirname, './output/flow-output.txt'), 'utf8')
    expect(parser.parse(output, struct)).toEqual(mockFlowsParsed())
})

test('groups', () => {
    const struct = mockGroupsStruct()
    const output =  fs.readFileSync(path.resolve(__dirname, './output/group-output.txt'), 'utf8')
    expect(parser.parse(output, struct)).toEqual(mockGroupsParsed())
})