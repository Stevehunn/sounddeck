import { useState, useEffect, useRef } from 'react'

export default function AudioVisualizer({ 
  filePath, 
  type = 'spectrum', // 'spectrum' | 'waveform' | 'oscilloscope'
  width = 300, 
  height = 100,
  color = 'var(--accent)',
  backgroundColor = 'transparent'
}) {
  const canvasRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const animationRef = useRef(null)
  const analyserRef = useRef(null)
  const audioContextRef = useRef(null)
  const sourceRef = useRef(null)

  useEffect(() => {
    const initAudio = async () => {
      try {
        const fileUrl = filePath.startsWith('file://') 
          ? filePath 
          : 'file:///' + filePath.replace(/\\/g, '/')
        
        const response = await fetch(fileUrl)
        const arrayBuffer = await response.arrayBuffer()
        
        const audioContext = new (window.AudioContext || window.webkitAudioContext)()
        audioContextRef.current = audioContext
        
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
        
        const source = audioContext.createBufferSource()
        source.buffer = audioBuffer
        sourceRef.current = source
        
        const analyser = audioContext.createAnalyser()
        analyser.fftSize = type === 'spectrum' ? 2048 : 1024
        analyser.smoothingTimeConstant = 0.8
        analyserRef.current = analyser
        
        source.connect(analyser)
        analyser.connect(audioContext.destination)
        
        source.start()
        setIsPlaying(true)
        
        drawVisualization()
        
      } catch (e) {
        console.error('Erreur initialisation visualisation:', e)
      }
    }
    
    if (filePath) {
      initAudio()
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close()
      }
    }
  }, [filePath, type])

  const drawVisualization = () => {
    const canvas = canvasRef.current
    if (!canvas || !analyserRef.current) return
    
    const ctx = canvas.getContext('2d')
    const analyser = analyserRef.current
    const width = canvas.width
    const height = canvas.height
    
    const draw = () => {
      animationRef.current = requestAnimationFrame(draw)
      
      ctx.clearRect(0, 0, width, height)
      
      if (backgroundColor !== 'transparent') {
        ctx.fillStyle = backgroundColor
        ctx.fillRect(0, 0, width, height)
      }
      
      if (type === 'spectrum') {
        const dataArray = new Uint8Array(analyser.frequencyBinCount)
        analyser.getByteFrequencyData(dataArray)
        
        const barWidth = width / dataArray.length * 2
        let x = 0
        
        const step = Math.max(1, Math.floor(dataArray.length / 200))
        
        for (let i = 0; i < dataArray.length; i += step) {
          const value = dataArray[i] / 255
          const barHeight = value * height * 0.9
          
          const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight)
          gradient.addColorStop(0, color + '44')
          gradient.addColorStop(1, color)
          
          ctx.fillStyle = gradient
          ctx.fillRect(x, height - barHeight, Math.max(1, barWidth * step), barHeight)
          
          x += barWidth * step + 1
        }
        
      } else if (type === 'waveform') {
        const dataArray = new Uint8Array(analyser.fftSize)
        analyser.getByteTimeDomainData(dataArray)
        
        ctx.beginPath()
        ctx.strokeStyle = color
        ctx.lineWidth = 2
        
        const sliceWidth = width / dataArray.length
        
        for (let i = 0; i < dataArray.length; i++) {
          const v = dataArray[i] / 128.0
          const y = v * height / 2
          
          if (i === 0) {
            ctx.moveTo(0, y)
          } else {
            ctx.lineTo(i * sliceWidth, y)
          }
        }
        
        ctx.stroke()
        
      } else if (type === 'oscilloscope') {
        const dataArray = new Uint8Array(analyser.fftSize)
        analyser.getByteTimeDomainData(dataArray)
        
        ctx.beginPath()
        ctx.strokeStyle = color
        ctx.lineWidth = 1.5
        
        const sliceWidth = width / dataArray.length
        
        for (let i = 0; i < dataArray.length; i++) {
          const v = dataArray[i] / 128.0
          const y = v * height / 2
          
          if (i === 0) {
            ctx.moveTo(0, y)
          } else {
            ctx.lineTo(i * sliceWidth, y)
          }
        }
        
        ctx.stroke()
        
        ctx.shadowColor = color
        ctx.shadowBlur = 20
        ctx.stroke()
        ctx.shadowBlur = 0
      }
    }
    
    draw()
  }

  return (
    <div style={{ position: 'relative', width: '100%', height }}>
      <canvas 
        ref={canvasRef} 
        width={width} 
        height={height}
        style={{ 
          width: '100%', 
          height: '100%', 
          borderRadius: 'var(--radius-md)',
          display: 'block'
        }}
      />
      {!isPlaying && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-tertiary)',
          fontSize: 12
        }}>
          <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      )}
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}