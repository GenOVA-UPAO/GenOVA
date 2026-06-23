import {
  PodcastWireframe, StoryboardWireframe, VideoWireframe, AnimatedDemoWireframe,
} from '../components/wireframes/WireframeMedia.jsx'
import {
  GameBoardWireframe, EscapeRoomWireframe, DragDropWireframe, ChatWireframe, StrategyWireframe,
} from '../components/wireframes/WireframeInteractive.jsx'
import {
  ComicWireframe, DilemmaWireframe, ArticleWireframe, RolesWireframe, ScenarioWireframe,
} from '../components/wireframes/WireframeNarrative.jsx'
import {
  TimelineWireframe, MindMapWireframe, ReadingWireframe, FAQWireframe,
  GlossaryWireframe, DiagramWireframe, TableWireframe, InfographicWireframe,
} from '../components/wireframes/WireframeVisual.jsx'
import {
  SliderWireframe, LabWireframe, HypothesisWireframe, CodeLabWireframe,
  DataAnalysisWireframe, MiniProjectWireframe, DesignChallengeWireframe,
} from '../components/wireframes/WireframeSimulator.jsx'
import {
  QuizWireframe, RubricWireframe, TimerChallengeWireframe, FillBlankWireframe,
  MatchingWireframe, CrosswordWireframe, EssayWireframe, EvalSimWireframe, CertificateWireframe,
} from '../components/wireframes/WireframeEvaluative.jsx'

export const RESOURCE_WIREFRAMES = {
  'engage:1':    ComicWireframe,
  'engage:2':    StoryboardWireframe,
  'engage:3':    PodcastWireframe,
  'engage:4':    GameBoardWireframe,
  'engage:5':    DilemmaWireframe,
  'engage:6':    ArticleWireframe,
  'engage:7':    RolesWireframe,
  'engage:8':    TimelineWireframe,
  'engage:9':    EscapeRoomWireframe,
  'engage:10':   SliderWireframe,

  'explore:1':   LabWireframe,
  'explore:2':   ChatWireframe,
  'explore:3':   DragDropWireframe,
  'explore:4':   VideoWireframe,
  'explore:5':   ReadingWireframe,
  'explore:6':   SliderWireframe,
  'explore:7':   LabWireframe,
  'explore:8':   RolesWireframe,
  'explore:9':   MindMapWireframe,
  'explore:10':  HypothesisWireframe,

  'explain:1':   VideoWireframe,
  'explain:2':   ReadingWireframe,
  'explain:3':   MindMapWireframe,
  'explain:4':   FAQWireframe,
  'explain:5':   AnimatedDemoWireframe,
  'explain:6':   GlossaryWireframe,
  'explain:7':   TimelineWireframe,
  'explain:8':   DiagramWireframe,
  'explain:9':   TableWireframe,
  'explain:10':  InfographicWireframe,

  'elaborate:1': ReadingWireframe,
  'elaborate:2': QuizWireframe,
  'elaborate:3': MiniProjectWireframe,
  'elaborate:4': LabWireframe,
  'elaborate:5': DataAnalysisWireframe,
  'elaborate:6': ScenarioWireframe,
  'elaborate:7': CodeLabWireframe,
  'elaborate:8': MindMapWireframe,
  'elaborate:9': StrategyWireframe,
  'elaborate:10':DesignChallengeWireframe,

  'evaluate:1':  QuizWireframe,
  'evaluate:2':  RubricWireframe,
  'evaluate:3':  TimerChallengeWireframe,
  'evaluate:4':  QuizWireframe,
  'evaluate:5':  FillBlankWireframe,
  'evaluate:6':  MatchingWireframe,
  'evaluate:7':  CrosswordWireframe,
  'evaluate:8':  EssayWireframe,
  'evaluate:9':  EvalSimWireframe,
  'evaluate:10': CertificateWireframe,
}
