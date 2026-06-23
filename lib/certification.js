export function certificateForResult(result = {}, totalQuestions = 0) {
  const percentage = Number(result.percentage || 0);
  const attempted = Number(result.correct || 0) + Number(result.incorrect || 0);
  const solvedLabel = `${attempted}/${totalQuestions || attempted} solved`;

  if (percentage >= 85 && Number(result.unanswered || 0) === 0) {
    return { tier: "diamond", label: "Diamond", title: "Diamond Clinical Reasoner", solvedLabel, message: "Elite accuracy with full commitment across the paper." };
  }
  if (percentage >= 70) {
    return { tier: "gold", label: "Gold", title: "Gold Clinical Finisher", solvedLabel, message: "Strong exam readiness with reliable decision-making." };
  }
  if (percentage >= 50) {
    return { tier: "silver", label: "Silver", title: "Silver Foundation Builder", solvedLabel, message: "A real base is forming; the next marks are in the traps." };
  }
  return { tier: "practice", label: "Practice", title: "Practice Builder", solvedLabel, message: "Useful attempt logged; the report is now your repair map." };
}
