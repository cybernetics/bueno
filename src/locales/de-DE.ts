import { joinWithCommas, words, capFirst, id, isNumber, deepMerge } from '../utils';
import { IR, mkRenderer, verb, atom, defaultBuilder, not, at, RenderingOptions } from '../DefaultIR'
import { MessageBuilder } from 'bueno/locale';

export type German =
  | { k : 'noun_', article_ : '' | 'ein' | 'eine', noun_ : string, name_ : string }


const germanVerb = (u : string, v : string, w : string) => verb<any>(
  x => [u, x, v],
  x => [u, 'nicht', x, v],
  x => [x, w],
  x => ['nicht', x, w]
)

const darf =
  germanVerb('darf', 'sein', 'ist')

const darfBestehen =
  germanVerb('darf', 'bestehen', 'besteht')

const mussSein =
  germanVerb('muss', 'sein', 'ist')

const mussLiegen =
  germanVerb('muss', 'liegen', 'liegt')

const mussWerden =
  germanVerb('muss', 'werden', 'wird')

function haben(name : string) : (ir : IR<German>) => IR<German> {
  return verb(
    x => ['muss', name, x, 'haben'],
    x => ['must nicht', name, x, 'haben'],
    x => ['es', name, x, 'hat'],
    x => ['es', 'nicht', name, x, 'hat']
  )
}

function eine(noun_ : string, name_ : string) : IR<German> {
  return darf(atom({ article_: 'eine', noun_, k: 'noun_', name_ }))
}

function ein(noun_ : string, name_ : string) : IR<German> {
  return darf(atom({ article_: 'ein', noun_, k: 'noun_', name_ }))
}

const germanBuilder = {

  ...defaultBuilder,

  mustBe: darf,

  mustHave: haben(''),

  has: haben,

  length: haben('eine Länge von'),

  sum: haben('eine Summe von'),

  atEvery(ir : IR<German>) : IR<German> {
    return at('jedes Element', ir)
  },

  more<A>(n : A) {
    return darf(`mehr als ${n}`, 'more');
  },

  less<A>(n : A) {
    return darf(`weniger als ${n}`, 'less');
  },

  atLeast<A>(lb : A) {
    return darf(`mindestens ${lb}`, 'atLeast')
  },

  between<A>(lb : A, ub : A) {
    return mussLiegen(`zwischen ${lb} und ${ub}`, 'between')
  },

  atMost<A>(ub : A) {
    return mussSein(`höchstens ${ub}`, 'atMost')
  },

  oneOf<A>(choices : A[]) {
    if (choices.length === 1) {
      return darf(`${choices[0]}`, 'oneOf')
    }
    return darf(
      `einer von ${joinWithCommas(choices.map(x => `${x}`), 'o')}`,
      'oneOf'
    )
  },

  exactly<A>(target : A) {
    return darf(`${target}`, 'exactly')
  },

  keys(keys : string[]) {
    const showKeys = (keys.length === 1
      ? `${keys[0]}`
      : `${joinWithCommas(keys, 'und')}`)
    // TODO: Remove cast to `any`
    return not((haben('unerwarteten Schlüssel') as any)(showKeys, 'keys'))
  },

  email: eine('gültige E-Mail-Adresse', 'email'),

  alphanum: darfBestehen('nur aus Buchstaben und Zahlen', 'alphanum'),

  uuid: ein('UUID', 'uuid'),

  url: eine('gültige URL', 'url'),

  even: darf('gerade', 'even'),

  odd: darf('ungerade', 'odd'),

  empty: darf('leer', 'empty'),

  date: ein('gültiges Datum', 'date'),

  iterable: darf('iterable', 'iterable'),

  array: eine('Liste', 'array'),

  string: ein('Text', 'string'),

  set: ein('Satz', 'set'),

  map: eine('Abbildung', 'map'),

  bool: deepMerge([darf('wahr'), darf('falsch')]),

  number: eine('Zahl', 'number'),

  integer: eine('ganze Zahl', 'integer'),

  object: ein('Objekt', 'object'),

  leftOut: mussWerden('weggelassen'),

  json: ein('gültiges JSON-Objekt', 'json')
}

function renderGermanAtom<Out>(
  nouns : German[],
  props : RenderingOptions<German, Out>
) : Out {
  let lastArticle = '';
  const ns : Out[] = nouns.filter(x => x.k === 'noun_').map(n => {
    if (n.article_ && (n.article_ !== lastArticle)) {
      lastArticle = n.article_
      return props.words([
        props.fromstr(n.article_),
        props.noun(n.noun_, n.name_, n.article_)
      ])
    }
    return props.noun(n.noun_, n.name_, n.article_)
  })
  return props.or(ns)
}

export const deDEOptions : RenderingOptions<German, string> = {
  fromstr: id,
  or: (words : string[]) => joinWithCommas(words, 'oder'),
  and: (words : string[]) => joinWithCommas(words, 'und'),
  when: (conseq : string, cond : string) => `${conseq} wenn ${cond}`,
  elem: (path : (string | number)[]) => `element Nummer #${path.map(x => isNumber(x) ? (x as number) + 1 : x).join('.')}`,
  path: (path : string[]) => path.join('.'),
  noun: id,
  atom: renderGermanAtom,
  words,
  finalize: capFirst,
  pathAtKey: (path, verb, byKey) => {
    return words(byKey ? [verb] : [path, verb])
  }
}

export const deDE = {
  renderer: mkRenderer<German, string>(deDEOptions),
  builder: germanBuilder,
}
