import React, { useRef, useState } from "react"
import ReactPlayer from "react-player/lazy"
import { FaPlay, FaPause, FaVolumeUp, FaVolumeDown, FaVolumeMute, FaExpand } from "react-icons/fa"

export default function CustomPlayer({ url }: { url: string }) {
    const playerRef = useRef<ReactPlayer>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    const [isPlaying, setIsPlaying] = useState(true)
    const [progress, setProgress] = useState(0)
    const [duration, setDuration] = useState(0)
    const [muted, setMuted] = useState(true)
    const [volume, setVolume] = useState(0.8)
    const [showControls, setShowControls] = useState(true)


    const togglePlay = () => setIsPlaying((prev) => !prev)
    const toggleMute = () => setMuted((prev) => !prev)

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = Math.floor(seconds % 60)
        return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
    }

    const handleSeek = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        const rect = e.currentTarget.getBoundingClientRect()
        const clickX = e.clientX - rect.left
        const newProgress = (clickX / rect.width) * duration
        playerRef.current?.seekTo(newProgress)
        setProgress((newProgress / duration) * 100)
    }

    const handleFullscreen = () => {
        if (containerRef.current) {
            if (!document.fullscreenElement) {
                containerRef.current.requestFullscreen()
            } else {
                document.exitFullscreen()
            }
        }
    }

    return (
        <div
            ref={containerRef}
            className="relative w-full pt-[56.25%] bg-black group"
            onTouchStart={() => setShowControls(true)}
            onMouseMove={() => setShowControls(true)}
        >
            <ReactPlayer
                ref={playerRef}
                url={`https://www.youtube.com/watch?v=${url}`}
                playing={isPlaying}
                muted={muted}
                volume={volume}
                controls={false}
                width="100%"
                height="100%"
                style={{ position: "absolute", top: 0, left: 0 }}
                onProgress={({ playedSeconds }) => setProgress((playedSeconds / duration) * 100)}
                onDuration={(d) => setDuration(d)}
            />


            {/* Overlay controls */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 text-white text-sm flex flex-col gap-2 transition-opacity duration-300 opacity-100 group-hover:opacity-100">
                {/* Progress bar */}
                <div className="w-full h-2 bg-gray-600 rounded-full relative cursor-pointer" onClick={handleSeek}>
                    <div className="h-full bg-[#DF9DC0] rounded-full" style={{ width: `${progress}%` }} />
                    <div
                        className="absolute top-1/2 transform -translate-y-1/2"
                        style={{ left: `calc(${progress}% - 6px)` }}
                    >
                        <div className="w-3 h-3 bg-[#DF9DC0] rounded-full" />
                    </div>
                </div>

                {/* Buttons */}
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                        <button onClick={togglePlay} className="text-2xl">
                            {isPlaying ? <FaPause /> : <FaPlay />}
                        </button>

                        {/* Volume control */}
                        <div className="flex items-center gap-2 relative w-32">
                            <button onClick={toggleMute} className="text-xl">
                                {muted || volume === 0 ? (
                                    <FaVolumeMute className="text-white" />
                                ) : volume < 0.5 ? (
                                    <FaVolumeDown className="text-white" />
                                ) : (
                                    <FaVolumeUp className="text-white" />
                                )}
                            </button>

                            <div className="relative w-full h-2 bg-gray-700 rounded-full cursor-pointer"
                                onClick={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect()
                                    const x = e.clientX - rect.left
                                    const newVolume = Math.min(1, Math.max(0, x / rect.width))
                                    setVolume(newVolume)
                                    setMuted(newVolume === 0)
                                }}
                            >
                                <div
                                    className="h-2 bg-[#DF9DC0] rounded-full absolute top-0 left-0"
                                    style={{ width: `${muted ? 0 : volume * 100}%` }}
                                />
                                <div
                                    className="w-4 h-4 bg-[#DF9DC0] rounded-full absolute top-1/2 -translate-y-1/2"
                                    style={{ left: `${muted ? 0 : volume * 100}%`, transform: "translate(-50%, -50%)" }}
                                />
                            </div>
                        </div>


                        <span className="text-sm">
                            {formatTime((progress / 100) * duration)} / {formatTime(duration)}
                        </span>
                    </div>

                    <button onClick={handleFullscreen} className="text-xl">
                        <FaExpand />
                    </button>
                </div>
            </div>
        </div>
    )

}