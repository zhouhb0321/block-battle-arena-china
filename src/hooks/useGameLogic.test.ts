import { renderHook, act } from '@testing-library/react';
import { useGameLogic } from './useGameLogic';
import { GAME_MODES, GamePiece, TetrominoType } from '@/utils/gameTypes';
import * as tetrisLogic from '@/utils/tetrisLogic';
import React from 'react';

// Mock the entire tetrisLogic module
vi.mock('@/utils/tetrisLogic');

// Mock the AuthContext module to provide a mock user
vi.mock('@/contexts/AuthContext', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        useAuth: () => ({
            user: { id: 'test-user', isGuest: false },
        }),
    };
});

// A mock TetrominoType for testing
const mockTetromino: TetrominoType = {
    name: 'I',
    type: 'I',
    shape: [[1, 1, 1, 1]],
    color: 'cyan',
};

// A mock GamePiece for testing
const mockGamePiece: GamePiece = {
    type: mockTetromino,
    x: 3,
    y: 0,
    rotation: 0,
};


describe('useGameLogic', () => {
  const sprint40Mode = GAME_MODES.find(m => m.id === 'sprint40')!;
  const timeAttack2Mode = GAME_MODES.find(m => m.id === 'timeAttack2')!;

  beforeEach(() => {
    vi.resetAllMocks();

    vi.spyOn(tetrisLogic, 'createEmptyBoard').mockReturnValue(Array(20).fill(Array(10).fill(0)));
    vi.spyOn(tetrisLogic, 'generateRandomPiece').mockReturnValue(mockTetromino);
    vi.spyOn(tetrisLogic, 'createNewPiece').mockReturnValue(mockGamePiece);
    vi.spyOn(tetrisLogic, 'isValidPosition').mockReturnValue(true);
    vi.spyOn(tetrisLogic, 'calculateDropPosition').mockReturnValue(19);
    vi.spyOn(tetrisLogic, 'placePiece').mockImplementation((board) => board);
  });

  it('should end the game when 40 lines are cleared in Sprint mode', () => {
    const onGameEnd = vi.fn();

    vi.spyOn(tetrisLogic, 'clearLines').mockReturnValue({
      newBoard: Array(20).fill(Array(10).fill(0)),
      linesCleared: 4,
    });

    const { result } = renderHook(() => useGameLogic({
      gameMode: sprint40Mode,
      onGameEnd,
    }));

    act(() => {
      result.current.startGame();
    });

    for (let i = 0; i < 9; i++) {
      act(() => {
        result.current.hardDrop();
      });
    }

    expect(result.current.lines).toBe(36);
    expect(result.current.gameOver).toBe(false);

    act(() => {
      result.current.hardDrop();
    });

    expect(result.current.lines).toBe(40);
    expect(result.current.gameOver).toBe(true);
  });

  it('should end the game when time runs out in Time Attack mode', () => {
    vi.useFakeTimers();
    const onGameEnd = vi.fn();

    const { result } = renderHook(() => useGameLogic({
      gameMode: timeAttack2Mode,
      onGameEnd,
    }));

    act(() => {
      result.current.startGame();
    });

    expect(result.current.gameOver).toBe(false);

    act(() => {
      vi.advanceTimersByTime(119 * 1000);
    });

    expect(result.current.gameOver).toBe(false);

    act(() => {
      vi.advanceTimersByTime(2 * 1000);
    });

    expect(result.current.gameOver).toBe(true);

    vi.useRealTimers();
  });
});
