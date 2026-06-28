import type { PreviewMap } from './types'
import { ELABORATE_PREVIEWS } from './elaborate'
import { ENGAGE_PREVIEWS } from './engage'
import { EVALUATE_PREVIEWS } from './evaluate'
import { EXPLAIN_PREVIEWS } from './explain'
import { EXPLORE_PREVIEWS } from './explore'

export const RESOURCE_PREVIEWS: PreviewMap = {
  ...ENGAGE_PREVIEWS,
  ...EXPLORE_PREVIEWS,
  ...EXPLAIN_PREVIEWS,
  ...ELABORATE_PREVIEWS,
  ...EVALUATE_PREVIEWS,
}
