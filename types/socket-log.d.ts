
type ConsoleMethod = {
    [K in keyof Console]: K;
}[keyof Console];

interface PrintMessageLine {
    type: ConsoleMethod
    css: string
    msg: string
}

type PrintMessageLines = PrintMessageLine[]
