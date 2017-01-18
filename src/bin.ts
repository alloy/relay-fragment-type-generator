#!/usr/bin/env node

import * as fs from 'fs'
import * as GraphQL from 'graphql'
import * as minimist from 'minimist'
import * as findPackage from 'find-package-json'

import { generateRelayFragmentsInterface } from './index'

function banner() {
  console.log(`
Usage: ${process.argv[1]} --schema=path/to/schema.json [...FILES]

    --schema   The path to a GraphQL schema json file that was generated with an introspection query.
    --list     Print out the props interfaces for all FILES that contain Relay query fragments (the default).
    --update   Updates files to add the props interface.
    --version  The version of this tool.
    --help     This text.
  `.trim())
}

function fail(message: string) {
  console.log(message)
  process.exit(1)
}

interface ARGV {
  _: string[],
  schema?: string,
  help?: boolean,
  version?: boolean,
  list?: boolean,
  update?: boolean,
}

const argv: ARGV = minimist(process.argv.slice(2))

if (argv.help) {
  banner()
  process.exit(0)
}

if (argv.version) {
  console.log(findPackage(__dirname).next().value.version)
  process.exit(0)
}

if (!argv.schema || argv._.length === 0) {
  banner()
  process.exit(1)
}

if (!fs.existsSync(argv.schema)) {
  fail('The schema doesn’t exist at the provided path.')
}

let schema
try {
  const schemaSource: string = fs.readFileSync(argv.schema, { encoding: 'utf-8' })
  const schemaJSON = JSON.parse(schemaSource)
  schema = GraphQL.buildClientSchema(schemaJSON.data || schemaJSON)
}
catch(error) {
  fail(`Unable to read schema: ${error.message}`)
}

function forEachFileWithInterface(callback: (file: string, propsInterface: string, fileSource: string) => void) {
  argv._.forEach(file => {
    const source: string = fs.readFileSync(file, { encoding: 'utf-8' })
    const propsInterface = generateRelayFragmentsInterface(schema, source)
    if (propsInterface) callback(file, propsInterface, source)
  })
}

if (argv.update) {
  forEachFileWithInterface((file, propsInterface, source) => {
    console.log(file)
    const hasTrailingNewLine = source.endsWith("\n")
    let result = source
    if (!hasTrailingNewLine) {
      result = result + '\n'
    }
    result = result + '\n' + propsInterface
    if (hasTrailingNewLine) {
      result = result + '\n'
    }
    fs.writeFileSync(file, result, { encoding: 'utf-8' })
  })
} else {
  forEachFileWithInterface((file, propsInterface) => {
    console.log(file)
    console.log(propsInterface)
    console.log('')
  })
}
