const L = ({ w = 'full', h = '1.5' }) => (
  <div className={`h-${h} w-${w} bg-gray-300/80 rounded-full`} />
)

export function TimelineWireframe() {
  const nodes = [1, 2, 3, 4]
  return (
    <div className="flex flex-col gap-2 p-2 pt-3">
      <div className="relative flex items-center">
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-0.5 bg-gray-200" />
        {nodes.map((n, i) => (
          <div key={n} className={`relative flex-1 flex ${i % 2 === 0 ? 'justify-start' : 'justify-center'}`}>
            <div className="flex flex-col items-center gap-1">
              <div className={`h-4 w-4 rounded-full border-2 z-10 ${n === 2 ? 'bg-gray-400/70 border-gray-500' : 'bg-white border-gray-300'}`} />
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-1">
        {nodes.map((n) => (
          <div key={n} className="flex-1 flex flex-col gap-0.5">
            <L w="full" h="1" /><L w="2/3" h="1" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function MindMapWireframe() {
  return (
    <div className="relative h-28 p-2">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-7 w-14 bg-gray-400/60 rounded-full flex items-center justify-center">
        <L w="10" h="1" />
      </div>
      {[
        { top: '5%',  left: '5%'  },
        { top: '5%',  right: '5%' },
        { top: '55%', left: '2%'  },
        { top: '55%', right: '2%' },
        { top: '80%', left: '30%' },
        { top: '80%', right: '30%'},
      ].map((pos, i) => (
        <div key={i} className="absolute h-5 w-10 bg-gray-200/80 rounded-full" style={pos} />
      ))}
    </div>
  )
}

export function ReadingWireframe() {
  return (
    <div className="flex flex-col gap-1.5 p-2">
      {[null, 'highlight', null, null, 'highlight', null].map((type, i) => (
        <L key={i} w={i % 3 === 2 ? '3/4' : 'full'} h={type === 'highlight' ? '2' : '1.5'} />
      ))}
      <div className="border border-dashed border-gray-300 rounded p-1.5 flex flex-col gap-1 mt-1">
        <L w="2/3" h="1" /><L w="full" h="1" />
      </div>
    </div>
  )
}

export function FAQWireframe() {
  return (
    <div className="flex flex-col gap-1.5 p-2">
      {[true, false, false].map((open, i) => (
        <div key={i} className={`border border-gray-200 rounded-md overflow-hidden ${open ? 'bg-gray-50' : ''}`}>
          <div className="flex items-center justify-between px-2 py-1.5">
            <L w="3/4" h="1" />
            <div className="h-3 w-3 rounded-sm bg-gray-300/80 shrink-0" />
          </div>
          {open && <div className="px-2 pb-2 flex flex-col gap-1"><L /><L w="3/4" /></div>}
        </div>
      ))}
    </div>
  )
}

export function GlossaryWireframe() {
  return (
    <div className="flex flex-col gap-1.5 p-2">
      {['A', 'B', 'C'].map((letter) => (
        <div key={letter} className="flex gap-2 items-start">
          <div className="h-6 w-6 bg-gray-300/60 rounded text-[9px] text-gray-500 flex items-center justify-center shrink-0">{letter}</div>
          <div className="flex-1 flex flex-col gap-0.5 pt-0.5"><L w="2/3" h="1.5" /><L w="full" h="1" /></div>
        </div>
      ))}
    </div>
  )
}

export function DiagramWireframe() {
  return (
    <div className="p-2 flex flex-col gap-2">
      <div className="flex justify-center">
        <div className="h-7 w-16 bg-gray-300/70 rounded-md flex items-center justify-center"><L w="10" h="1" /></div>
      </div>
      <div className="flex justify-center"><div className="w-0.5 h-3 bg-gray-300" /></div>
      <div className="flex gap-2 justify-center">
        {[1,2,3].map(i => (
          <div key={i} className="h-7 w-12 bg-gray-200/80 rounded-md flex items-center justify-center"><L w="8" h="1" /></div>
        ))}
      </div>
      <div className="flex justify-center"><div className="w-0.5 h-2 bg-gray-300" /></div>
      <div className="flex gap-2 justify-center">
        {[1,2].map(i => <div key={i} className="h-6 w-14 bg-gray-100 rounded border border-gray-200 flex items-center justify-center"><L w="10" h="1" /></div>)}
      </div>
    </div>
  )
}

export function TableWireframe() {
  return (
    <div className="p-2">
      <table className="w-full text-[9px]">
        <thead>
          <tr>{['A','B','C'].map(h => <th key={h} className="p-1 bg-gray-300/80 border border-gray-200 text-gray-500">{h}</th>)}</tr>
        </thead>
        <tbody>
          {[1,2,3].map(r => (
            <tr key={r}>{[1,2,3].map(c => <td key={c} className="p-1 border border-gray-200 bg-white"><div className="h-1.5 bg-gray-200 rounded-full" /></td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function InfographicWireframe() {
  return (
    <div className="flex gap-2 p-2">
      <div className="flex flex-col gap-2">
        {[80, 55, 35].map((pct, i) => (
          <div key={i} className="flex flex-col items-center gap-0.5">
            <div className="h-2 w-6 bg-gray-400/60 rounded-full text-[8px] text-gray-500 text-center leading-tight">{pct}</div>
            <div className="w-6 bg-gray-200 rounded" style={{ height: `${pct * 0.35}px` }}><div className="w-full bg-gray-400/60 rounded" style={{ height: `${pct * 0.35}px` }} /></div>
          </div>
        ))}
      </div>
      <div className="flex-1 flex flex-col gap-1.5 justify-center">
        <L /><L w="3/4" /><L w="4/5" /><L w="2/3" />
      </div>
    </div>
  )
}
