
export function calculateScore(amount: number, ip: string, device: string, email: string): { score: number, factors: string[] } {
    let score = 0;
    const factors: string[] = [];
    if (email.endsWith('.ru') || email.endsWith('fraud.net')) {
        score += 0.3;
        factors.push('use of a flagged domain');
    };
    if (amount > 1000) {
        score += 0.3;
        factors.push('high transaction amount');
    }
    if (ip === '198.51.100.22' || device === 'abc123') {
        score += 0.3;
    }
    return { score: Math.min(score, 1), factors };
}

export function getRiskLevel(score: number): 'low' | 'moderate' | 'high' {
    if (score < 0.3) return 'low';
    if (score < 0.7) return 'moderate';
    return 'high';
}
