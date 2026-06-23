const L = ({ w = 'full', h = '1.5' }) => (
  <div className={`h-${h} w-${w} bg-gray-300/80 rounded-full`} />
)

function SliderRow({ value = 0.4 }) {
  return (
    <div className="flex items-center gap-2">
      <L w="12" h="1" />
      <div className="flex-1 relative h-1.5 bg-gray-200 rounded-full">
        <div className="absolute h-1.5 rounded-full bg-gray-400/70" style={{ width: `${value * 100}%` }} />
        <div className="absolute h-3 w-3 rounded-full bg-gray-500 border-2 border-white shadow-sm top-1/2 -translate-y-1/2" style={{ left: `calc(${value * 100}% - 6px)` }} />
      </div>
      <L w="6" h="1" />
    </div>
  )
}

export function SliderWireframe() {
  return (
    <div className="flex flex-col gap-2 p-2">
      <SliderRow value={0.3} />
      <SliderRow value={0.6} />
      <SliderRow value={0.45} />
      <div className="h-10 bg-gray-100 rounded-md border border-gray-200 flex items-end p-1 gap-0.5">
        {[20,35,55,40,65,50,70,45].map((h, i) => (
          <div key={i} className="flex-1 bg-gray-300/80 rounded-t-sm" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  )
}

export function LabWireframe() {
  return (
    <div className="flex flex-col gap-2 p-2">
      <div className="flex gap-2">
        {[1,2].map(i => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="h-10 w-6 bg-gray-200/80 rounded-b-xl rounded-t-sm" />
            <L w="10" h="1" />
          </div>
        ))}
        <div className="flex-1 flex flex-col items-center gap-1">
          <div className="h-10 w-8 bg-gray-200/80 rounded-xl" />
          <L w="10" h="1" />
        </div>
      </div>
      <div className="flex flex-col gap-1 border border-gray-200 rounded-md p-1.5 bg-gray-50">
        <div className="text-[9px] text-gray-400">Paso 1:</div>
        <L w="3/4" h="1" />
      </div>
      <div className="flex flex-col gap-1"><L /><L w="3/4" /></div>
    </div>
  )
}

export function HypothesisWireframe() {
  return (
    <div className="flex flex-col gap-2 p-2">
      <div className="flex flex-col gap-1">
        <div className="text-[9px] text-gray-400">Mi hipótesis:</div>
        <div className="h-10 border border-dashed border-gray-300 rounded-md bg-gray-50 flex items-center px-2">
          <L w="4/5" h="1" />
        </div>
      </div>
      <div className="flex gap-1 items-center">
        <div className="h-5 flex-1 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full w-2/3 bg-gray-400/60 rounded-full" />
        </div>
        <div className="h-5 w-5 rounded-full bg-gray-300/80 shrink-0 flex items-center justify-center text-[9px] text-gray-500">✓</div>
      </div>
      <div className="flex flex-col gap-1 border border-gray-200 rounded-md p-1.5">
        <L /><L w="3/4" />
      </div>
    </div>
  )
}

export function CodeLabWireframe() {
  return (
    <div className="flex flex-col gap-1.5 p-2">
      <div className="bg-gray-800/10 rounded-md p-2 flex flex-col gap-1 font-mono">
        {['function solve() {', '  // tu código', '  return result;', '}'].map((_line, i) => (
          <div key={i} className="flex gap-1.5">
            <span className="text-[8px] text-gray-400/60 w-3 shrink-0">{i + 1}</span>
            <div className={`h-1.5 bg-gray-300/70 rounded-full`} style={{ width: `${[65,50,75,35][i]}%` }} />
          </div>
        ))}
      </div>
      <div className="h-px bg-gray-200" />
      <div className="bg-gray-100 rounded-md p-2 flex flex-col gap-1">
        <span className="text-[9px] text-gray-400">{'>'} Output</span>
        <L w="1/2" h="1" />
      </div>
    </div>
  )
}

export function DataAnalysisWireframe() {
  return (
    <div className="flex flex-col gap-2 p-2">
      <div className="flex items-center gap-1 bg-gray-100 rounded p-1.5">
        <L w="3/4" h="1" />
        <div className="h-4 w-8 bg-gray-300/80 rounded shrink-0" />
      </div>
      <div className="flex gap-1 h-14 items-end">
        {[40,70,50,85,60,45,90].map((h, i) => (
          <div key={i} className="flex-1 flex flex-col justify-end gap-0.5">
            <div className="w-full bg-gray-300/80 rounded-t" style={{ height: `${h}%` }} />
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-1"><L /><L w="2/3" /></div>
    </div>
  )
}

export function MiniProjectWireframe() {
  return (
    <div className="flex flex-col gap-1.5 p-2">
      <L w="3/4" h="2" />
      {[true, true, false, false].map((done, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <div className={`h-4 w-4 rounded border-2 ${done ? 'bg-gray-400/60 border-gray-400' : 'border-gray-300'} shrink-0 flex items-center justify-center`}>
            {done && <div className="h-1.5 w-1.5 bg-white rounded-sm" />}
          </div>
          <L w={done ? 'full' : '3/4'} h="1" />
        </div>
      ))}
      <div className="h-2 bg-gray-200 rounded-full mt-1"><div className="h-full w-1/2 bg-gray-400/60 rounded-full" /></div>
    </div>
  )
}

export function DesignChallengeWireframe() {
  return (
    <div className="flex flex-col gap-2 p-2">
      <div className="bg-gray-100 rounded-md p-1.5 flex flex-col gap-1">
        <L w="1/2" h="1" /><L w="full" h="1" />
      </div>
      <div className="h-12 border-2 border-dashed border-gray-300 rounded-md bg-gray-50 flex items-center justify-center">
        <span className="text-[9px] text-gray-300">espacio de trabajo</span>
      </div>
      <div className="flex gap-1">
        {[1,2,3,4,5].map(i => <div key={i} className="h-4 flex-1 border border-gray-200 rounded" />)}
      </div>
    </div>
  )
}
