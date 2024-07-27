export default function ridgeLoader({
    src,
    width,
    quality,
}: {
    src: string
    width: number
    quality?: number
}) {
    if (src.startsWith("http")) {
        return src
    }

    if (src.startsWith("/")) {
        src = src.slice(1)
    }

    return `/static/${src}`
}
