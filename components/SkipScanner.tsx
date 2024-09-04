'use client'
import React, {useEffect, useRef, useState} from 'react';
import * as poseDetection from '@tensorflow-models/pose-detection';
import * as tf from '@tensorflow/tfjs-core';
// Register one of the TF.js backends.
import '@tensorflow/tfjs-backend-webgl';
// import '@tensorflow/tfjs-backend-wasm';


const SkipScanner = () => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const detectorRef = useRef<any>(null);
    const [jumpCount, setJumpCount] = useState(0); // State to keep track of jump count
    const [isUp, setIsUp] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const isUpRef = useRef(isUp);

    useEffect(() => {
        isUpRef.current = isUp;
    }, [isUpRef]);

    const loadModel = async () => {
        const detectorConfig = {modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING};
        detectorRef.current = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, detectorConfig);
    };

    const setupCamera = async () => {
        const video: any = videoRef.current;
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480 }
        });
        console.log(stream)
        video.srcObject = stream;

        return new Promise((resolve) => {
            video.onloadedmetadata = () => {
                console.log(video)
                resolve(video);
            };
        });
    };

    const detectPose = async () => {
        const video: any = videoRef.current;
        const canvas: any = canvasRef.current;
        const ctx = canvas.getContext('2d');

        if (detectorRef.current && video.readyState === 4) {
            const poses: any = await detectorRef.current.estimatePoses(video);

            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Draw keypoints
            poses.forEach((pose: any) => {
                pose.keypoints.forEach((keypoint: any, index: any) => {
                    // console.log(keypoint.x, keypoint.y, keypoint.name)
                    if (keypoint.score > 0.5) {
                        ctx.beginPath();
                        ctx.arc(keypoint.x, keypoint.y, 5, 0, 2 * Math.PI);
                        if(index === 11 || index === 12){
                            ctx.fillStyle = 'red';
                        } else {
                            ctx.fillStyle = 'blue';
                        }

                        ctx.fill();
                    }
                });
                const left = pose.keypoints.find((point: any) => point.name === 'left_hip');
                const right = pose.keypoints.find((point: any) => point.name === 'right_hip');
                if (left.score > 0.5 && right.score > 0.5) {
                    const avgAnkleY = (left.y + right.y) / 2; // Average y position of both ankles
                    console.log('hips:',avgAnkleY)
                    if(230 - avgAnkleY > 20 && !isUp) {
                        setJumpCount(prevState => prevState + 1)
                        setIsUp(prevState => true)
                    }
                    if(230 - avgAnkleY < 20) {
                        setIsUp(prevState => false)
                    }
                }
            });
        }
    };

    useEffect(() => {
        const runPoseDetection = async () => {
            await tf.ready()
            await loadModel();
            await setupCamera();
            setIsReady(true)
        };
        runPoseDetection()
    }, []);

    useEffect(() => {
        let intervalId
        intervalId = setInterval(() => {
            detectPose()
        },50)
        return () => {
            clearInterval(intervalId)
        }
    }, [jumpCount, isUp]);

    return (
        <div className='relative w-full h-[100vh] overflow-hidden'>
            <div className='relative z-10'>
                <h1>{isUp ? 'FLY!' : "Stay"}</h1>
                <p>{jumpCount}</p>
            </div>
            <div className='absolute left-1/2 -translate-x-1/2'>
                <video ref={videoRef} style={{display: "none"}} autoPlay playsInline></video>
                <canvas ref={canvasRef} width="640" height="480" className='border border-black h-[100vh]'></canvas>
            </div>
        </div>
    );
};

export default SkipScanner;