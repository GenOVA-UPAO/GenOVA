const L = ({ w = 'full', h = '1.5' }) => (
  <div className={`h-${h} w-${w} bg-gray-300/80 rounded-full`} />
)
const Opt = ({ checked = false }) => (
  <div className="flex items-center gap-1.5">
    <div className={`h-3 w-3 rounded-full border-2 ${checked ? 'bg-gray-400 border-gray-400' : 'border-gray-300'} shrink-0`} />
    <L w="3/4" h="1" />
  </div>
)

export function QuizWireframe() {
  return (
    <div className="flex flex-col gap-2 p-2">
      <div className="bg-gray-50 border border-gray-200 rounded-md p-2 flex flex-col gap-1">
        <L /><L w="3/4" />
      </div>
      {[false, true, false, false].map((c, i) => <Opt key={i} checked={c} />)}
      <div className="flex justify-between items-center mt-1">
        <div className="h-1.5 w-20 bg-gray-200 rounded-full"><div className="h-full w-1/4 bg-gray-400/60 rounded-full" /></div>
        <div className="h-5 w-16 bg-gray-300/80 rounded" />
      </div>
    </div>
  )
}

export function RubricWireframe() {
  return (
    <div className="p-2">
      <table className="w-full text-[8px] border-collapse">
        <thead>
          <tr>
            <th className="p-1 bg-gray-300/70 border border-gray-200 text-gray-500">Criterio</th>
            {['1','2','3'].map(n => <th key={n} className="p-1 bg-gray-300/70 border border-gray-200 text-gray-500">{n}</th>)}
          </tr>
        </thead>
        <tbody>
          {['A','B','C'].map((r, ri) => (
            <tr key={r}>
              <td className="p-1 border border-gray-200 bg-gray-100 text-gray-400">{r}</td>
              {[0,1,2].map(ci => (
                <td key={ci} className="p-1 border border-gray-200 text-center">
                  {ri === 1 && ci === 2 ? <div className="h-2.5 w-2.5 rounded-full bg-gray-400 mx-auto" /> : <div className="h-2.5 w-2.5 rounded-full border border-gray-300 mx-auto" />}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function TimerChallengeWireframe() {
  return (
    <div className="flex flex-col items-center gap-2 p-2">
      <div className="h-14 w-14 rounded-full border-4 border-gray-300/80 flex items-center justify-center">
        <div className="text-center">
          <div className="h-3 w-8 bg-gray-400/70 rounded-full mb-0.5" />
          <div className="h-1.5 w-5 bg-gray-300/80 rounded-full mx-auto" />
        </div>
      </div>
      <div className="w-full border border-gray-200 rounded-md p-2 flex flex-col gap-1">
        <L /><L w="3/4" />
      </div>
      <div className="flex gap-1 w-full">
        {['A','B','C','D'].map(opt => (
          <div key={opt} className="flex-1 h-6 border border-gray-200 rounded flex items-center justify-center text-[8px] text-gray-400">{opt}</div>
        ))}
      </div>
    </div>
  )
}

export function FillBlankWireframe() {
  return (
    <div className="flex flex-col gap-1.5 p-2">
      <div className="text-[9px] text-gray-400">Completa el texto:</div>
      {[
        ['El', '___', 'es fundamental para'],
        ['entender', '___', 'en este contexto.'],
        ['Esto permite', '___', '.'],
      ].map((parts, i) => (
        <div key={i} className="flex items-center gap-0.5 flex-wrap">
          {parts.map((part, j) => (
            part === '___'
              ? <div key={j} className="h-5 w-12 border-b-2 border-gray-400 bg-gray-50 rounded-sm" />
              : <div key={j} className="h-1 bg-gray-300/70 rounded-full" style={{ width: `${part.length * 5}px` }} />
          ))}
        </div>
      ))}
    </div>
  )
}

export function MatchingWireframe() {
  const pairs = [['Concepto A','Def 1'],['Concepto B','Def 2'],['Concepto C','Def 3']]
  return (
    <div className="flex gap-2 p-2 items-start">
      <div className="flex flex-col gap-2 flex-1">
        {pairs.map(([_a], i) => (
          <div key={i} className="h-6 bg-gray-200/80 rounded px-1.5 flex items-center"><L w="full" h="1" /></div>
        ))}
      </div>
      <div className="flex flex-col gap-2 items-center justify-around self-stretch">
        {[0,1,2].map(i => <div key={i} className="h-px w-5 bg-gray-400/60" style={{ marginTop: i === 0 ? '12px' : i === 1 ? '8px' : '4px' }} />)}
      </div>
      <div className="flex flex-col gap-2 flex-1">
        {['Def 3','Def 1','Def 2'].map((_d, i) => (
          <div key={i} className="h-6 border border-dashed border-gray-300 rounded px-1.5 flex items-center"><L w="3/4" h="1" /></div>
        ))}
      </div>
    </div>
  )
}

export function CrosswordWireframe() {
  const grid = [
    [0,1,0,1,0],
    [1,1,1,1,1],
    [0,1,0,0,0],
    [1,1,1,1,0],
    [0,0,0,1,0],
  ]
  return (
    <div className="flex gap-2 p-2 items-start">
      <div className="grid gap-0.5" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        {grid.flat().map((cell, i) => (
          <div key={i} className={`h-4 w-4 ${cell ? 'bg-white border border-gray-300' : 'bg-gray-400/50'} rounded-sm`} />
        ))}
      </div>
      <div className="flex-1 flex flex-col gap-1">
        <div className="text-[8px] text-gray-400">↔ 1. <div className="inline-block h-1 w-10 bg-gray-200 rounded-full" /></div>
        <div className="text-[8px] text-gray-400">↕ 1. <div className="inline-block h-1 w-8 bg-gray-200 rounded-full" /></div>
        <div className="text-[8px] text-gray-400">↔ 2. <div className="inline-block h-1 w-9 bg-gray-200 rounded-full" /></div>
      </div>
    </div>
  )
}

export function EssayWireframe() {
  return (
    <div className="flex flex-col gap-2 p-2">
      <div className="bg-gray-50 border border-gray-200 rounded-md p-2 flex flex-col gap-1">
        <L /><L w="3/4" />
      </div>
      <div className="flex-1 h-12 border border-dashed border-gray-300 rounded-md bg-white p-1.5 flex flex-col gap-1">
        <L w="full" h="1" /><L w="4/5" h="1" /><L w="3/4" h="1" />
      </div>
      <div className="flex justify-between items-center">
        <div className="flex gap-1"><div className="h-4 w-4 bg-gray-200 rounded text-[8px] flex items-center justify-center text-gray-400">B</div><div className="h-4 w-4 bg-gray-200 rounded text-[8px] flex items-center justify-center text-gray-400 italic">I</div></div>
        <L w="12" h="1" />
      </div>
    </div>
  )
}

export function EvalSimWireframe() {
  return (
    <div className="flex flex-col gap-2 p-2">
      <div className="bg-gray-100 rounded-md p-2 flex flex-col gap-1">
        <L /><L w="3/4" />
      </div>
      <div className="flex gap-1.5 justify-center">
        {['A','B'].map(opt => (
          <div key={opt} className="flex-1 h-7 border border-gray-300 rounded-md flex items-center justify-center text-[9px] text-gray-400">{opt}</div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <L w="8" h="1" />
        <div className="flex-1 h-2 bg-gray-200 rounded-full"><div className="h-full w-[85%] bg-gray-400/60 rounded-full" /></div>
        <L w="6" h="1" />
      </div>
    </div>
  )
}

export function CertificateWireframe() {
  return (
    <div className="m-2 border-2 border-gray-300/70 rounded-md p-2 flex flex-col items-center gap-2">
      <div className="h-8 w-8 rounded-full border-2 border-gray-300/80 bg-gray-100 flex items-center justify-center">
        <div className="h-4 w-4 rounded-full bg-gray-300/80" />
      </div>
      <div className="flex flex-col items-center gap-1 w-full">
        <L w="3/4" h="2" />
        <L w="1/2" h="1" />
        <div className="w-3/4 h-px bg-gray-300 my-1" />
        <L w="2/3" h="1" /><L w="1/2" h="1" />
      </div>
    </div>
  )
}
