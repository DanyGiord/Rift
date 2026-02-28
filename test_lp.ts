import { getTierValue } from './lib/riot'

console.log('IRON IV 0 LP:', getTierValue('IRON', 'IV', 0))
console.log('IRON I 99 LP:', getTierValue('IRON', 'I', 99))
console.log('BRONZE IV 0 LP:', getTierValue('BRONZE', 'IV', 0))
console.log('SILVER I 99 LP:', getTierValue('SILVER', 'I', 99))
console.log('GOLD IV 14 LP:', getTierValue('GOLD', 'IV', 14))
console.log('EMERALD IV 0 LP:', getTierValue('EMERALD', 'IV', 0))
console.log('PLATINUM I 100 LP:', getTierValue('PLATINUM', 'I', 100))
console.log('DIAMOND I 100 LP:', getTierValue('DIAMOND', 'I', 100))
console.log('MASTER 0 LP:', getTierValue('MASTER', 'I', 0))
console.log('MASTER 120 LP:', getTierValue('MASTER', 'I', 120))
console.log('GRANDMASTER 500 LP:', getTierValue('GRANDMASTER', 'I', 500))

console.log('--- Delta Checks ---')
console.log('SILVER I 99 LP -> GOLD IV 14 LP:', getTierValue('GOLD', 'IV', 14) - getTierValue('SILVER', 'I', 99)) // Expected 15
console.log('PLATINUM I 80 LP -> EMERALD IV 10 LP:', getTierValue('EMERALD', 'IV', 10) - getTierValue('PLATINUM', 'I', 80)) // Expected 30
console.log('DIAMOND I 90 LP -> MASTER 15 LP:', getTierValue('MASTER', 'I', 15) - getTierValue('DIAMOND', 'I', 90)) // Expected 25
