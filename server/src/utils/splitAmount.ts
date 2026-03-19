export function splitAmount(amount: number, people: number): number[] {
  const totalPaise = Math.round(amount * 100);
  const base = Math.floor(totalPaise / people);

  let remainder = totalPaise % people;

  const splits: number[] = [];

  for (let i = 0; i < people; i++) {
    let share = base;

    if (remainder > 0) {
      share += 1;
      remainder--;
    }

    splits.push(share / 100);
  }

  // Smallest share first so it can be assigned to the expense settler.
  return splits.sort((a, b) => a - b);
}
