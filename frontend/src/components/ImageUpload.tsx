// src/components/ImageUpload.tsx
import { useState, useRef } from 'react'
import { Camera, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ImageUploadProps {
  value?: string // URL atual da imagem
  onChange: (file: File) => void // callback com o arquivo
  onRemove?: () => void
  shape?: 'circle' | 'square' // formato da preview
  size?: 'sm' | 'md' | 'lg'
  placeholder?: string
}

export function ImageUpload({ 
  value, 
  onChange, 
  onRemove,
  shape = 'circle',
  size = 'md',
  placeholder = 'Adicionar foto'
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(value || null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [showCamera, setShowCamera] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Tamanhos
  const sizes = {
    sm: 'h-16 w-16',
    md: 'h-24 w-24',
    lg: 'h-32 w-32'
  }

  // Abrir câmera
  const handleAbrirCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } // câmera traseira no celular
      })
      setStream(mediaStream)
      setShowCamera(true)
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
        }
      }, 100)
    } catch (err) {
      console.error('Erro ao acessar câmera:', err)
      alert('Não foi possível acessar a câmera. Tente fazer upload da galeria.')
    }
  }

  // Tirar foto
  const handleTirarFoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current
      canvas.width = videoRef.current.videoWidth
      canvas.height = videoRef.current.videoHeight
      canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0)
      
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], 'foto-camera.jpg', { type: 'image/jpeg' })
          const url = URL.createObjectURL(blob)
          setPreview(url)
          onChange(file)
          handleFecharCamera()
        }
      }, 'image/jpeg', 0.8)
    }
  }

  // Fechar câmera
  const handleFecharCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    setShowCamera(false)
  }

  // Upload da galeria
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setPreview(url)
      onChange(file)
    }
  }

  const shapeClass = shape === 'circle' ? 'rounded-full' : 'rounded-lg'

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Preview da imagem */}
      <div className={`relative ${sizes[size]} ${shapeClass} bg-gray-100 
        border-2 border-dashed border-gray-300 overflow-hidden`}>
        {preview ? (
          <>
            <img 
              src={preview} 
              alt="Preview" 
              className="w-full h-full object-cover"
            />
            {onRemove && (
              <button
                onClick={() => { setPreview(null); onRemove() }}
                className="absolute top-0 right-0 bg-red-500 text-white 
                  rounded-full p-0.5 m-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Camera className="w-8 h-8 text-gray-400" />
          </div>
        )}
      </div>

      {/* Botões de ação */}
      {!showCamera && (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="text-xs"
          >
            <Upload className="w-3 h-3 mr-1" />
            Galeria
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAbrirCamera}
            className="text-xs"
          >
            <Camera className="w-3 h-3 mr-1" />
            Câmera
          </Button>
        </div>
      )}

      {/* Input de arquivo oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Modal da câmera */}
      {showCamera && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          <div className="flex justify-between items-center p-4">
            <span className="text-white font-medium">Tirar Foto</span>
            <button onClick={handleFecharCamera}>
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline
            className="flex-1 object-cover"
          />
          <canvas ref={canvasRef} className="hidden" />
          <div className="p-6 flex justify-center">
            <button
              onClick={handleTirarFoto}
              className="w-16 h-16 bg-white rounded-full border-4 
                border-green-500 flex items-center justify-center"
            >
              <Camera className="w-8 h-8 text-green-600" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
