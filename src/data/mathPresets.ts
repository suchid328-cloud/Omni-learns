import { MathPreset } from '../types';

export const MATH_PRESETS: MathPreset[] = [
  {
    title: 'Definite Integral & Area',
    category: 'Calculus',
    problem: 'Evaluate the definite integral: \\int_{0}^{\\pi} x \\sin(x) \\, dx and determine the exact geometric area under the curve.',
    difficulty: 'Intermediate',
  },
  {
    title: 'Quadratic Optimization',
    category: 'Algebra & Optimization',
    problem: 'A company models its profit function as P(x) = -3x^2 + 180x - 1200, where x is the number of units sold. Find the maximum profit and optimal production quantity using differentiation and vertex formulas.',
    difficulty: 'Beginner',
  },
  {
    title: 'Bayes Theorem Probability',
    category: 'Statistics & Probability',
    problem: 'A rare disease affects 0.1% of the population. A diagnostic test has 99% true positive rate (sensitivity) and 2% false positive rate. If a patient tests positive, what is the exact posterior probability that they actually have the disease?',
    difficulty: 'Intermediate',
  },
  {
    title: 'Eigenvalues & Diagonalization',
    category: 'Linear Algebra',
    problem: 'Find the eigenvalues and corresponding eigenvectors for the 2x2 matrix A = [[4, 1], [2, 3]]. Verify that the trace and determinant match the eigenvalues.',
    difficulty: 'Advanced',
  },
  {
    title: 'Second-Order Differential Equation',
    category: 'Differential Equations',
    problem: 'Solve the initial value problem: y\'\' + 4y\' + 13y = 0 with initial conditions y(0) = 2 and y\'(0) = -1.',
    difficulty: 'Advanced',
  },
  {
    title: 'Kinematics Projectile Motion',
    category: 'Physics & Applied Math',
    problem: 'A projectile is launched from ground level at an initial velocity v_0 = 40 m/s at an elevation angle of \\theta = 30^\\circ with g = 9.8 m/s^2 (ignoring air resistance). Calculate maximum height, total flight time, and horizontal range.',
    difficulty: 'Intermediate',
  },
  {
    title: 'Infinite Series Convergence',
    category: 'Calculus & Series',
    problem: 'Determine whether the infinite series \\sum_{n=1}^{\\infty} \\frac{n^2}{2^n} converges using the Ratio Test, and calculate its exact sum.',
    difficulty: 'Advanced',
  }
];
