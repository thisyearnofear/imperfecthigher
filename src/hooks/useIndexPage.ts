import { useState, useEffect, useRef } from "react";
import {
  PoseData,
  CoachPersonality,
  CoachModel,
  SessionSummaries,
  ChatMessage,
  HeightUnit,
} from "@/lib/types";
import { useAchievements } from "@/hooks/useAchievements";
import { useAudioFeedback } from "@/hooks/useAudioFeedback";
import { useWorkout } from "@/hooks/useWorkout";
import { usePerformanceStats } from "@/hooks/usePerformanceStats";
import { useAIFeedback } from "@/hooks/useAIFeedback";
import { mapPersonalityToLegacy } from "@/lib/coachPersonalities";

export const useIndexPage = () => {
  // UI and settings state
  const [isDebugMode, setIsDebugMode] = useState(false);
  const [isRecordingEnabled, setIsRecordingEnabled] = useState(false);
  const [poseData, setPoseData] = useState<PoseData | null>(null);
  const [coachPersonality, setCoachPersonality] =
    useState<CoachPersonality>("RASTA");
  const [isMobileSettingsOpen, setIsMobileSettingsOpen] = useState(false);
  const [isAudioFeedbackEnabled, setIsAudioFeedbackEnabled] = useState(false);
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [sessionSummaries, setSessionSummaries] =
    useState<SessionSummaries | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [selectedCoaches, setSelectedCoaches] = useState<CoachModel[]>([
    "gemini",
  ]);
  const [sessionHasConcluded, setSessionHasConcluded] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [heightUnit, setHeightUnit] = useState<HeightUnit>(() => {
    const saved = localStorage.getItem("heightUnit");
    return (saved as HeightUnit) || "cm";
  });

  // Workout state managed by custom hook
  const {
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
  } = useWorkout(coachPersonality);

  const analyticsRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);

  // Other hooks
  const { repTimings, sessionDuration } = usePerformanceStats(
    repHistory,
    sessionStart
  );
  const { achievements } = useAchievements(
    reps,
    repHistory,
    formScore,
    repTimings.stdDev
  );
  const { speak } = useAudioFeedback();
  const { getAISessionSummary, getAIChatResponse } = useAIFeedback({
    exercise: selectedExercise,
    coachPersonality: mapPersonalityToLegacy(coachPersonality),
    workoutMode,
    onFormFeedback: setFormFeedback,
  });
  const wasWorkoutActive = useRef(isWorkoutActive);

  const handleTryAgain = () => {
    resetSession();
    setIsAnalyticsOpen(false);
    setSessionHasConcluded(false);
    setChatMessages([]);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleHeightUnitChange = (unit: HeightUnit) => {
    setHeightUnit(unit);
    localStorage.setItem("heightUnit", unit);
  };

  // Effects
  useEffect(() => {
    // When workout ends, open analytics if reps were done
    if (wasWorkoutActive.current && !isWorkoutActive && repHistory.length > 0) {
      setFormFeedback("Time's up! Great session. Here's your summary.");
      setIsAnalyticsOpen(true);
      setSessionHasConcluded(true);
      setTimeout(
        () =>
          analyticsRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          }),
        300
      );
    }
    wasWorkoutActive.current = isWorkoutActive;
  }, [isWorkoutActive, repHistory.length, setFormFeedback, analyticsRef]);

  useEffect(() => {
    if (sessionHasConcluded && repHistory.length > 0) {
      setIsSummaryLoading(true);
      getAISessionSummary(
        {
          reps,
          averageFormScore: formScore,
          repHistory,
        },
        selectedCoaches
      ).then((summaries) => {
        setSessionSummaries(summaries);
        setIsSummaryLoading(false);
      });
    } else {
      setSessionSummaries(null);
      setIsSummaryLoading(false);
    }
  }, [
    sessionHasConcluded,
    selectedCoaches,
    getAISessionSummary,
    repHistory,
    reps,
    formScore,
  ]);

  useEffect(() => {
    if (isAudioFeedbackEnabled && formFeedback) {
      if (
        formFeedback.includes("Enable your camera") ||
        formFeedback.includes("Model loaded")
      )
        return;
      speak(formFeedback);
    }
  }, [formFeedback, isAudioFeedbackEnabled, speak]);

  useEffect(() => {
    const root = document.documentElement;
    if (isHighContrast) {
      root.classList.add("high-contrast");
    } else {
      root.classList.remove("high-contrast");
    }
  }, [isHighContrast]);

  const handleSendMessage = async (message: string, model: CoachModel) => {
    if (!message.trim()) return;

    const newUserMessage: ChatMessage = { role: "user", content: message };
    setChatMessages([newUserMessage]);
    setIsChatLoading(true);

    const response = await getAIChatResponse(
      [newUserMessage], // Only send the current question as history
      {
        reps,
        averageFormScore: formScore,
        repHistory,
      },
      model
    );

    const newAssistantMessage: ChatMessage = {
      role: "assistant",
      content: response,
    };
    setChatMessages([newUserMessage, newAssistantMessage]);
    setIsChatLoading(false);
  };

  return {
    // State
    isDebugMode,
    isRecordingEnabled,
    poseData,
    coachPersonality,
    isMobileSettingsOpen,
    isAudioFeedbackEnabled,
    isHighContrast,
    isAnalyticsOpen,
    sessionSummaries,
    isSummaryLoading,
    selectedCoaches,
    selectedExercise,
    reps,
    formFeedback,
    formScore,
    repHistory,
    workoutMode,
    timeLeft,
    isWorkoutActive,
    repTimings,
    sessionDuration,
    achievements,
    analyticsRef,
    topRef,
    chatMessages,
    isChatLoading,
    heightUnit,
    sessionHasConcluded,
    // Setters
    setIsDebugMode,
    setIsRecordingEnabled,
    setPoseData,
    setCoachPersonality,
    setIsMobileSettingsOpen,
    setIsAudioFeedbackEnabled,
    setIsHighContrast,
    setIsAnalyticsOpen,
    setSelectedCoaches,
    setReps,
    setFormFeedback,
    setFormScore,
    handleHeightUnitChange,
    // Handlers
    handleExerciseChange,
    handleWorkoutModeChange,
    handleNewRepData,
    resetSession,
    endSession,
    handleTryAgain,
    handleSendMessage,
  };
};
