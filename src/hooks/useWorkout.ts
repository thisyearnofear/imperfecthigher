import { useState, useEffect, useCallback } from "react";
import { Exercise, RepData, WorkoutMode, CoachPersonality } from "@/lib/types";
import { getPersonalityFeedback } from "@/lib/coachPersonalities";

const WORKOUT_DURATION = 120; // 2 minutes in seconds

export const useWorkout = (coachPersonality: CoachPersonality = "SNEL") => {
  const [selectedExercise, setSelectedExercise] =
    useState<Exercise>("pull-ups");
  const [reps, setReps] = useState(0);
  const [formFeedback, setFormFeedback] = useState(
    getPersonalityFeedback(coachPersonality, "session_start")
  );
  const [formScore, setFormScore] = useState(100);
  const [sessionStart, setSessionStart] = useState<number | null>(null);
  const [repHistory, setRepHistory] = useState<RepData[]>([]);
  const [workoutMode, setWorkoutMode] = useState<WorkoutMode>("training");
  const [timeLeft, setTimeLeft] = useState(WORKOUT_DURATION);
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);

  const endSession = useCallback(() => {
    setIsWorkoutActive(false);
  }, []);

  useEffect(() => {
    if (!isWorkoutActive || timeLeft <= 0) {
      if (isWorkoutActive && timeLeft <= 0) {
        endSession();
      }
      return;
    }

    const intervalId = setInterval(() => {
      setTimeLeft((prevTime) => prevTime - 1);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [isWorkoutActive, timeLeft, endSession]);

  const resetSession = useCallback(() => {
    setReps(0);
    setFormScore(100);
    setSessionStart(null);
    setRepHistory([]);
    setIsWorkoutActive(false);
    setTimeLeft(WORKOUT_DURATION);
  }, []);

  const handleExerciseChange = useCallback(
    (exercise: Exercise) => {
      if (exercise !== selectedExercise) {
        setSelectedExercise(exercise);
        resetSession();
        setFormFeedback(
          `Switched to ${exercise.replace("-", " ")}. ${getPersonalityFeedback(
            coachPersonality,
            "session_start"
          )}`
        );
      }
    },
    [selectedExercise, resetSession, coachPersonality]
  );

  const handleWorkoutModeChange = useCallback(
    (mode: WorkoutMode) => {
      if (mode === workoutMode) return;

      setWorkoutMode(mode);
      resetSession();

      let initialFeedback;
      if (mode === "assessment") {
        initialFeedback =
          "Assessment mode: Get into position. Scoring starts on your first rep.";
      } else {
        initialFeedback = getPersonalityFeedback(
          coachPersonality,
          "session_start"
        );
      }
      setFormFeedback(initialFeedback);
    },
    [workoutMode, resetSession, selectedExercise, coachPersonality]
  );

  const handleNewRepData = useCallback(
    (data: RepData) => {
      if (!sessionStart) {
        setSessionStart(Date.now() - 2000);
      }
      if (!isWorkoutActive) {
        setIsWorkoutActive(true);
        setTimeLeft(WORKOUT_DURATION);
      }
      setRepHistory((prev) => [...prev, data]);
    },
    [sessionStart, isWorkoutActive]
  );

  return {
    selectedExercise,
    reps,
    formFeedback,
    formScore,
    sessionStart,
    repHistory,
    workoutMode,
    timeLeft,
    isWorkoutActive,
    setReps,
    setFormFeedback,
    setFormScore,
    handleExerciseChange,
    handleWorkoutModeChange,
    handleNewRepData,
    resetSession,
    endSession,
  };
};
