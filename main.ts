const fs = require('fs')
const { readFile } = require('fs/promises')
const myPrompt = require('prompt')

const CONFIG = {
    IN_FILE_NAME_PROPERTIES: [
        {
            name: 'inputName',
            description: 'Enter input file name (empty to exit)',
            type: 'string'
        }
    ],
    OUT_FILE_NAME_PROPERTIES: [
        {
            name: 'outputName',
            description: 'Enter output file name (empty to skip)',
            type: 'string'
        }
    ],
    MODE_PROPERTIES: [
        {
            name: 'mode',
            description: 'Enter mode',
            validator: /^((encode)|(decode))$/,
            warning: 'Must be either encode or decode',
            required: true
        }
    ],
    TYPE_PROPERTIES: [
        {
            name: 'type',
            description: 'Enter type',
            validator: /^((omega)|(gamma)|(delta)|(fib))$/,
            warning: 'Can be: omega, gamma, delta or fib (else will default to omega)'
        }
    ]
}

const getEntropy = (data: Buffer): number => {
    let entropy = 0
    const counts = Array(256).fill(0)
    for (const symbol of data) counts[symbol]++
    for (const count of counts) {
        let freq = count / data.length
        if (freq) entropy -= freq * Math.log2(freq)
    }
    return entropy
}

const bufferFromBinString = (binStr: string, bytes = binStr.match(/[01]{8}|[01]+/g)): Buffer => Buffer.from(new Uint8Array([...bytes.map(val => parseInt(val.padEnd(8, '0'), 2)), bytes[bytes.length - 1].length]).buffer)
const binStringFromBuffer = (data: Buffer, cut = data[data.length - 1]): string => data.reduce((res, val) => res + val.toString(2).padStart(8, '0'), '').slice(0, (data.length - 2) * 8 + cut)

// OMEGA

const eliasOmegaEncode_core = (n: number, r = '0', b = n.toString(2)): string => (n - 1 > 0 ? eliasOmegaEncode_core(b.length - 1, b + r) : r)
const eliasOmegaEncode = (indices: Array<number>): string => indices.reduce((res, val) => res + eliasOmegaEncode_core(val), '')

const eliasOmegaDecode_core = (bits: any, r: Array<number> = [], b = 1) => bits.map((bit: any) => (b = bits-- ? b * 2 + bit : ((bits = bit ? b : !r.push(b)), 1))) && r
const eliasOmegaDecode = (data: string): Array<number> => eliasOmegaDecode_core([...data].map(Number))

// GAMMA

const eliasGammaEncode_core = (x: number, n = Math.floor(Math.log2(x))) => (x == 1 ? '1' : '0'.repeat(n) + '1' + (x - (1 << n)).toString(2).padStart(n, '0'))
const eliasGammaEncode = (indices: Array<number>): string => indices.reduce((res, val) => res + eliasGammaEncode_core(val), '')

const eliasGammaDecode_parse = (bits: string, l = bits.length >> 1) => (l == 0 ? 1 : Math.pow(2, l) + parseInt(bits.substring(l + 1), 2))
const eliasGammaDecode_core = (bits: string): string[] => {
    let res: string[] = []
    let curr = bits
    while (curr.length > 0) {
        let b = curr.match(/0*1/)[0]
        let l = b.length - 1
        let e = 2 * l + 1
        res.push(curr.substring(0, e))
        curr = curr.substring(e)
    }
    return res
}
const eliasGammaDecode = (data: string): Array<number> => eliasGammaDecode_core(data).map(val => eliasGammaDecode_parse(val)) //prettier-ignore

// DELTA

const eliasDeltaEncode_core = (x: number, n = Math.floor(Math.log2(x))) => (x == 1 ? '1' : eliasGammaEncode_core(n + 1) + (x - (1 << n)).toString(2).padStart(n, '0'))
const eliasDeltaEncode = (indices: Array<number>): string => indices.reduce((res, val) => res + eliasDeltaEncode_core(val), '')

const eliasDeltaDecode_parse = (bits: string, l = bits.match(/0*1/)[0].length - 1) => (l == 0 ? 1 : Math.pow(2, eliasGammaDecode_parse(bits.substring(0, 2 * l + 1)) - 1) + parseInt(bits.substring(2 * l + 1), 2))
const eliasDeltaDecode_core = (bits: string): string[] => {
    let res: string[] = []
    let curr = bits
    while (curr.length > 0) {
        let b = curr.match(/0*1/)[0]
        let l = b.length - 1
        let e = 2 * l + 1
        let n = eliasGammaDecode_parse(curr.substring(0, e))
        e += n - 1
        res.push(curr.substring(0, e))
        curr = curr.substring(e)
    }

    return res
}
const eliasDeltaDecode = (data: string): Array<number> => eliasDeltaDecode_core(data).map(val => eliasDeltaDecode_parse(val)) //prettier-ignore

// FIBONACCI

let fibTab: any = Array.from({ length: 100 }).reduce((acc: Array<number>, val, i) => acc.concat(i > 1 ? acc[i - 1] + acc[i - 2] : i), [])
fibTab = fibTab.slice(2)
const checkFib = (x: number) => {
    while (fibTab[fibTab.length - 1] + fibTab[fibTab.length - 2] <= x) fibTab.push(fibTab[fibTab.length - 1] + fibTab[fibTab.length - 2])
    let max = fibTab.find((val: number, ind: number, arr: Array<number>) => !(ind + 1 in arr) || (arr[ind + 1] > x && val <= x))
    return fibTab.indexOf(max)
}
const checkFibInd = (ind: number) => {
    if (ind - fibTab.length > 0) console.log('a')

    for (let i = 0; i < ind - fibTab.length + 1; i++) fibTab.push(fibTab[fibTab.length - 1] + fibTab[fibTab.length - 2])
}

const fibonacciEncode_core = (x: number, tab = fibTab.slice(0, checkFib(x) + 1).reverse(), r = x) => tab.reduce((res: string, val: number) => res + ((r -= val) >= 0 ? '1' : (r += val) && '0'), '1').split('').reverse().join('') //prettier-ignore
const fibonacciEncode = (indices: Array<number>): string => indices.reduce((res, val) => res + fibonacciEncode_core(val), '')

const fibonacciDecode_core = (bits: Array<string>, _ = checkFibInd(bits.length)) => bits.reduce((res, val, ind) => res + Number(val) * fibTab[ind], 0)
const fibonacciDecode = (data: string): Array<number> => data.split('11').slice(0, -1).map(val => fibonacciDecode_core([...val, '1'])) //prettier-ignore

// LZW

const LZW = (data: Buffer): Array<number> => {
    let indices: Array<number> = []
    const table = new Map(Array.from({ length: 256 }, (_, i) => JSON.stringify([i])).map((val, ind) => [val, ind]))
    let p: number[] = [data[0]]

    for (let i = 0; i < data.length; i++) {
        let c: number[] = []
        if (i != data.length - 1) c = [data[i + 1]]
        let pc_string = JSON.stringify([...p, ...c])
        if (table.has(pc_string)) {
            p = [...p, ...c]
        } else {
            indices.push(table.get(JSON.stringify(p)) + 1)
            table.set(pc_string, table.size)
            p = c
        }
    }
    indices.push(table.get(JSON.stringify(p)) + 1)

    return indices.map(val => val++)
}

const LZW_inv = (indices: Array<number>): Buffer => {
    let data: number[] = []
    const table: Array<number[]> = Array.from({ length: 256 }, (_, i) => [i])
    let prev = table[indices[0] - 1]
    let p = prev[0]

    data.push(p)
    for (const index of indices.slice(1)) {
        let s: number[]
        if (!(index - 1 in table)) s = [...prev, p]
        else s = [...table[index - 1]]
        data.push(...s)
        p = s[0]
        table.push([...prev, p])
        prev = s
    }

    return Buffer.from(new Uint8Array(data).buffer)
}

const encode = (data: Buffer, type: string): Buffer => {
    switch (type) {
        case 'gamma':
            return bufferFromBinString(eliasGammaEncode(LZW(data)))
        case 'delta':
            return bufferFromBinString(eliasDeltaEncode(LZW(data)))
        case 'fib':
            return bufferFromBinString(fibonacciEncode(LZW(data)))
        default:
            console.log('Type is invalid: ', type, ' - defaulting to Omega')
        case 'omega':
            return bufferFromBinString(eliasOmegaEncode(LZW(data)))
    }
}
const decode = (data: Buffer, type: string): Buffer => {
    switch (type) {
        case 'gamma':
            return LZW_inv(eliasGammaDecode(binStringFromBuffer(data)))
        case 'delta':
            return LZW_inv(eliasDeltaDecode(binStringFromBuffer(data)))
        case 'fib':
            return LZW_inv(fibonacciDecode(binStringFromBuffer(data)))
        default:
            console.log('Type is invalid ', type, ' - defaulting to Omega')
        case 'omega':
            return LZW_inv(eliasOmegaDecode(binStringFromBuffer(data)))
    }
}

// TESTS BELOW ALL PASSED

// for (let i = 1; i < 1000; i++) if (i != eliasDeltaDecode_parse(eliasDeltaEncode_core(i))) console.log('aaa')

// let s = 'WYS*WYGWYS*WYSWYSG'
// let enc = LZW(Buffer.from(s))
// console.log(s)
// console.log(enc)
// let dec = LZW_inv(enc)
// console.log(dec)
// console.log(dec.toString())

// const fune = [eliasOmegaEncode, eliasGammaEncode, eliasDeltaEncode, fibonacciEncode]
// const fund = [eliasOmegaDecode, eliasGammaDecode, eliasDeltaDecode, fibonacciDecode]
// for (let j = 0; j < 4; j++) {
//     let enc = fune[j]
//     let dec = fund[j]
//     for (let i = 0; i < 1000; i++) {
//         let arr = []
//         for (let j = 0; j < Math.floor(Math.random() * 5000 + 5); j++) arr.push(Math.floor(Math.random() * 254 + 1))
//         let decoded = dec(enc(arr))
//         if (JSON.stringify(arr) != JSON.stringify(decoded)) console.log('Test failed:\n', decoded, arr, 'ERROR elias\n')
//     }
// }

// for (let i = 0; i < 1000; i++) {
//     let arr = []
//     for (let j = 0; j < Math.floor(Math.random() * 30 + 5); j++) arr.push(Math.floor(Math.random() * 254 + 1))
//     let decoded = LZW_inv(LZW(Buffer.from(arr)))
//     if (JSON.stringify(Buffer.from(arr)) != JSON.stringify(Buffer.from(decoded))) console.log('Test failed:\n', Buffer.from(arr), '\n', decoded, '\nERROR lzw\n')
// }

const execute = (data: Buffer, mode: string, type: string): Buffer => {
    let processedData: Buffer = undefined
    if (mode == 'encode') {
        console.time('Encoding time')
        processedData = encode(data, type)
        console.timeEnd('Encoding time')
        console.log('ENCODED: ', processedData)
        console.log('> Length before: ', data.length)
        console.log('> Length after: ', processedData.length)
        console.log('> Compression ratio: ', data.length / processedData.length)
        console.log('> Entropy before: ', getEntropy(data))
        console.log('> Entropy after: ', getEntropy(processedData))
    } else if (mode == 'decode') {
        console.time('Decoding time')
        processedData = decode(data, type)
        console.timeEnd('Decoding time')
        console.log('DECODED: ', processedData)
    } else {
        console.log('Mode is invalid: ', mode)
        return null
    }
    return processedData
}

const writeToFile = (outputName: string, processedData: Buffer) => {
    fs.mkdir('./out', (err: any) => {
        if (err && err.errno != -17) {
            console.log(err, 'Output path corrupted')
            return
        }

        fs.writeFile('./out/' + outputName, processedData, { encoding: 'utf8', flag: 'w' }, (err: any) => {
            if (err) console.log(err, 'Output file corrupted')
        })
    })
}

;(async () => {
    // FAST EXECUTION
    if (process.argv.slice(2).length > 0) {
        let [inputName, mode, type, outputName] = process.argv.slice(2)
        let data = await readFile(inputName)
        console.log('FILE: ', data)
        let processedData = execute(data, mode, type)
        if (outputName !== undefined) writeToFile(outputName, processedData)
        return
    }

    myPrompt.start()
    readingInput: while (true) {
        // INPUT
        var { inputName } = await myPrompt.get(CONFIG.IN_FILE_NAME_PROPERTIES)
        if (inputName === '') return
        let mode_v, type_v, outputName
        let fast = false
        if (inputName.split(' ').length > 2) {
            ;[fast, inputName, mode_v, type_v, outputName] = [true, ...inputName.split(' ')]
            myPrompt.message = ''
            myPrompt.delimiter = ''
            CONFIG.IN_FILE_NAME_PROPERTIES[0].description = ' '
        }

        let data: any
        try {
            data = await readFile(inputName)
            console.log('FILE: ', data)
        } catch (exc) {
            console.log(exc, 'File not found')
            continue readingInput
        }

        // MODE & CALCULATIONS
        if (!fast) {
            let { mode } = await myPrompt.get(CONFIG.MODE_PROPERTIES)
            let { type } = await myPrompt.get(CONFIG.TYPE_PROPERTIES)
            ;[mode_v, type_v] = [mode, type]
        }

        let processedData = execute(data, mode_v, type_v)
        if (processedData == null) continue readingInput

        // OUTPUT
        if (!fast) outputName = await myPrompt.get(CONFIG.OUT_FILE_NAME_PROPERTIES)

        if (outputName !== '') writeToFile(outputName, processedData)
    }
})()
