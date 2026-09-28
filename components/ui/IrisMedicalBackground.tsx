export default function IrisMedicalBackground() {
    return (
        <div
            aria-hidden="true"
            className="
        pointer-events-none
        absolute
        inset-0
        z-0
        overflow-hidden
        bg-[#020a1a]
      "
        >
            {/* Main atmospheric glow */}
            <div
                className="
          absolute
          left-1/2
          top-1/2
          h-[70vw]
          w-[70vw]
          max-h-[1000px]
          max-w-[1000px]
          -translate-x-1/2
          -translate-y-1/2
          rounded-full
          bg-[#0077ff]/10
          blur-[140px]
        "
            />

            {/* Medical cyan light */}
            <div
                className="
          absolute
          -left-[15%]
          top-[10%]
          h-[45vw]
          w-[45vw]
          rounded-full
          bg-[#01a9ea]/[0.06]
          blur-[120px]
        "
            />

            {/* Deep blue light */}
            <div
                className="
          absolute
          -right-[15%]
          bottom-[5%]
          h-[50vw]
          w-[50vw]
          rounded-full
          bg-[#012676]/20
          blur-[130px]
        "
            />

            {/* =========================================
          Main Iris
         ========================================= */}

            <div
                className="
          iris-background
          absolute
          left-1/2
          top-1/2
          aspect-square
          w-[min(105vw,1200px)]
          -translate-x-1/2
          -translate-y-1/2
        "
            >
                {/* Outer ring */}
                <div
                    className="
            iris-ring-outer
            absolute
            inset-0
            rounded-full
            border
            border-cyan-300/[0.07]
          "
                />

                {/* Technical dashed ring */}
                <div
                    className="
            iris-ring-dashed
            absolute
            inset-[5%]
            rounded-full
            border
            border-dashed
            border-cyan-300/[0.08]
          "
                />

                {/* Main scanner ring */}
                <div
                    className="
            iris-ring-main
            absolute
            inset-[13%]
            rounded-full
            border
            border-cyan-300/[0.12]
          "
                />

                {/* Inner ring */}
                <div
                    className="
            absolute
            inset-[23%]
            rounded-full
            border
            border-cyan-300/[0.07]
          "
                />

                {/* Iris */}
                <div
                    className="
            absolute
            inset-[25%]
            overflow-hidden
            rounded-full
          "
                >
                    {/* Iris fibers */}
                    <div className="iris-fibers absolute inset-0 rounded-full" />

                    {/* Iris atmosphere */}
                    <div
                        className="
              absolute
              inset-0
              rounded-full
              bg-[radial-gradient(circle,rgba(1,7,18,0.98)_0_17%,rgba(0,88,155,0.42)_30%,rgba(0,169,235,0.15)_55%,transparent_73%)]
            "
                    />

                    {/* Pupil */}
                    <div
                        className="
              absolute
              left-1/2
              top-1/2
              h-[28%]
              w-[28%]
              -translate-x-1/2
              -translate-y-1/2
              rounded-full
              bg-[#01040a]
              shadow-[0_0_70px_rgba(0,169,235,0.22)]
            "
                    />

                    {/* Eye reflection */}
                    <div
                        className="
              absolute
              left-[36%]
              top-[29%]
              h-[7%]
              w-[7%]
              rounded-full
              bg-white/25
              blur-[3px]
            "
                    />
                </div>

                {/* Scanning beam */}
                <div
                    className="
            iris-scan
            absolute
            left-[19%]
            right-[19%]
            top-1/2
            h-px
            bg-cyan-300/60
            shadow-[0_0_14px_2px_rgba(0,200,255,0.45)]
          "
                />

                {/* Scan glow */}
                <div
                    className="
            iris-scan
            absolute
            left-[19%]
            right-[19%]
            top-1/2
            h-24
            -translate-y-1/2
            bg-gradient-to-b
            from-transparent
            via-cyan-400/[0.05]
            to-transparent
            blur-xl
          "
                />

                {/* Technical markers */}
                <div className="absolute inset-[9%]">
                    <span className="absolute left-1/2 top-0 h-5 w-px bg-cyan-300/25" />
                    <span className="absolute bottom-0 left-1/2 h-5 w-px bg-cyan-300/25" />
                    <span className="absolute left-0 top-1/2 h-px w-5 bg-cyan-300/25" />
                    <span className="absolute right-0 top-1/2 h-px w-5 bg-cyan-300/25" />
                </div>

                {/* Rotating diagnostic arc */}
                <div
                    className="
            iris-arc
            absolute
            inset-[7%]
            rounded-full
            border-r
            border-t
            border-cyan-300/20
          "
                />
            </div>

            {/* =========================================
          Subtle Medical Grid
         ========================================= */}

            <div
                className="
          absolute
          inset-0
          opacity-[0.018]
          [background-image:linear-gradient(rgba(255,255,255,.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.5)_1px,transparent_1px)]
          [background-size:70px_70px]
        "
            />

            {/* Vignette */}
            <div
                className="
          absolute
          inset-0
          bg-[radial-gradient(circle_at_center,transparent_10%,rgba(1,8,25,0.28)_55%,rgba(1,5,15,0.95)_100%)]
        "
            />
        </div>
    );
}