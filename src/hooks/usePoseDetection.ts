import { useEffect, useRef } from 'react';
import * as posedetection from '@tensorflow-models/pose-detection';
import { Exercise, RepData, PoseData, CoachPersonality, CameraStatus, WorkoutMode } from '@/lib/types';
import { drawPose } from '@/lib/drawing';
import { useModelLoader } from './useModelLoader';
import { useExerciseProcessor } from './useExerciseProcessor';

interface UsePoseDetectionProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  cameraStatus: CameraStatus;
  exercise: Exercise;
  onRepCount: (count: (prevCount: number) => number) => void;
  onFormFeedback: (message: string) => void;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  isDebugMode: boolean;
  onPoseData: (data: PoseData | null) => void;
  onFormScoreUpdate: (score: number) => void;
  onNewRepData: (data: RepData) => void;
  coachPersonality: CoachPersonality;
  workoutMode: WorkoutMode;
  isWorkoutActive: boolean;
}

export const usePoseDetection = ({
  videoRef,
  cameraStatus,
  exercise,
  onRepCount,
  onFormFeedback,
  canvasRef,
  isDebugMode,
  onPoseData,
  onFormScoreUpdate,
  onNewRepData,
  coachPersonality,
  workoutMode,
  isWorkoutActive,
}: UsePoseDetectionProps) => {
  const animationFrameId = useRef<number | null>(null);
  const keypointHistoryRef = useRef<posedetection.Keypoint[][]>([]);

  const { detector, modelStatus } = useModelLoader(cameraStatus === 'granted');

  useEffect(() => {
    if (modelStatus === 'loading') {
      onFormFeedback('Loading pose detection model...');
    } else if (modelStatus === 'ready') {
      onFormFeedback('Model loaded. Ready to start!');
    } else if (modelStatus === 'error') {
      onFormFeedback("The AI Coach could not be started. Try refreshing the page.");
    }
  }, [modelStatus, onFormFeedback]);

  const { processPose, formIssuePulse, avgScore, currentJumpHeight, jumpGroundLevel, jumpCalibrationData } = useExerciseProcessor({
    exercise,
    workoutMode,
    onRepCount,
    onFormFeedback,
    onFormScoreUpdate,
    onNewRepData,
    coachPersonality,
    isDebugMode,
    onPoseData,
    isWorkoutActive,
  });

  useEffect(() => {
    const detect = async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (detector && video && video.readyState === 4 && canvas) {
        const videoDimensions = { width: video.videoWidth, height: video.videoHeight };
        const poses = await detector.estimatePoses(video);
        const pose = poses && poses.length > 0 ? poses[0] : null;

        processPose(pose, videoDimensions);

        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          if (pose) {
            if (isDebugMode) {
              keypointHistoryRef.current.push(pose.keypoints);
              if (keypointHistoryRef.current.length > 20) {
                keypointHistoryRef.current.shift();
              }
            }
            
            // Enhanced drawing with jump-specific features
            drawPose(
              ctx, 
              pose, 
              exercise, 
              avgScore, 
              isDebugMode ? keypointHistoryRef.current : [], 
              formIssuePulse,
              jumpGroundLevel,
              currentJumpHeight,
              undefined, // renderParticleEffects
              jumpCalibrationData
            );
          } else {
            keypointHistoryRef.current = [];
          }
        }
      }
      animationFrameId.current = requestAnimationFrame(detect);
    };

    if (modelStatus === 'ready') {
      animationFrameId.current = requestAnimationFrame(detect);
    }

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [modelStatus, detector, videoRef, canvasRef, isDebugMode, exercise, avgScore, formIssuePulse, processPose, jumpGroundLevel, currentJumpHeight, jumpCalibrationData]);

  useEffect(() => {
    keypointHistoryRef.current = [];
  }, [exercise]);

  return {
    currentJumpHeight,
    jumpGroundLevel
  };
};
