'use client'
import React, {useEffect, useRef, useState} from 'react';
import * as poseDetection from '@tensorflow-models/pose-detection';
import * as tf from '@tensorflow/tfjs-core';
// Register one of the TF.js backends.
import '@tensorflow/tfjs-backend-webgl';
// import '@tensorflow/tfjs-backend-wasm';

const CounterComponent = ({ incomingValue }) => {
    const [counter, setCounter] = useState(0);  // Counter state
    const [prevValue, setPrevValue] = useState(null);  // Previous value state

    useEffect(() => {
        if (prevValue !== null) {
            const difference = Math.abs(incomingValue - prevValue);  // Calculate difference

            if (difference >= 50) {  // Check if difference is 50 or more
                setCounter((prevCounter) => prevCounter + 1);  // Increment counter
            }
        }
        setPrevValue(incomingValue);  // Update previous value

    }, [incomingValue]);  // Dependency on incomingValue changes

    return (
        <div>
            <h2>Counter: {counter}</h2>
        </div>
    );
};


const SkipScanner = () => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const detectorRef = useRef<any>(null);
    const [jumpCount, setJumpCount] = useState(0); // State to keep track of jump count
    // const [prevY, setPrevY] = useState<number | null>(0);
    // const [values, setValues] = useState<number[]>([]);
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
        const video = videoRef.current;
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
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        if (detectorRef.current && video.readyState === 4) {
            const poses = await detectorRef.current.estimatePoses(video);

            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Draw keypoints
            poses.forEach((pose) => {
                pose.keypoints.forEach((keypoint, index) => {
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
                const left = pose.keypoints.find(point => point.name === 'left_hip');
                const right = pose.keypoints.find(point => point.name === 'right_hip');
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
        <div>
            <h1>{isUp ? 'FLY!' : "Stay"}</h1>
            <h1>Pose Detection with Jump Detection</h1>
            <p style={{fontSize: '128px'}}>Jumps detected: {jumpCount}</p>
            <button onClick={detectPose}>add</button>
            <div>
                <video ref={videoRef} style={{display: "none"}} autoPlay playsInline width="640" height="480"></video>
                <canvas ref={canvasRef} width="640" height="480" className='border border-black'></canvas>
            </div>
        </div>
    );
};

export default SkipScanner;