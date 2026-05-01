"use client";

import { useEffect, useRef, useState } from "react";
import Bola from "./Bola.tsx";
import AutoMover from "./AutoMover.tsx";
import ManualMover from "./ManualMover.tsx";
import Barra from "./Barra.tsx";
import Pontuacao from "./Pontuacao.tsx";

export default function Game() {
    const barra1Ref = useRef<HTMLDivElement>(null);
    const barra2Ref = useRef<HTMLDivElement>(null);
    const bolaRef = useRef<HTMLDivElement>(null);
    const barra1VyRef = useRef(0);
    const barra2VyRef = useRef(0);
    const BALL_RADIUS = 20;
    const [score, setScore] = useState([0,0]);

    // Refs de velocidade — fonte de verdade, partilhada com AutoMover
    const VxRef = useRef(400);
    const VyRef = useRef(300);
    // Refs para o loop RAF de colisão
    const collisionRafRef = useRef<number | null>(null);
    const cooldownRef = useRef(0);

    function onGoal(scored: string){
        if (scored === "player1"){
            setScore([score[0] + 1, score[1]]);
        }
        else{
            setScore([score[0], score[1] + 1]);
        }
        // Resetar velocidade e estado de colisão
        VxRef.current = 400;
        VyRef.current = 300;
        prevBallCxRef.current = null;
        prevBallCyRef.current = null;
        cooldownRef.current = 30; // ignorar colisões durante ~0.5s após golo
    }

    // Posição anterior da bola para swept collision detection (anti-tunneling)
    const prevBallCxRef = useRef<number | null>(null);
    const prevBallCyRef = useRef<number | null>(null);

    // Devolve true se a bola (círculo) se sobrepõe ao rectângulo
    function circleOverlapsRect(
        cx: number, cy: number, r: number,
        rx: number, ry: number, rw: number, rh: number
    ): boolean {
        const closestX = Math.max(rx, Math.min(cx, rx + rw));
        const closestY = Math.max(ry, Math.min(cy, ry + rh));
        const dx = cx - closestX;
        const dy = cy - closestY;
        return (dx * dx + dy * dy) < (r * r);
    }

    // Verifica se a trajectória da bola neste frame cruzou uma face vertical da barra (anti-tunneling).
    // faceX: x da face; yMin/yMax: intervalo Y da barra (expandido por r).
    // Devolve o cy interpolado no momento do cruzamento, ou null se não cruzou.
    function sweptFaceCrossing(
        prevCx: number, prevCy: number,
        cx: number, cy: number,
        faceX: number, yMin: number, yMax: number,
        approachingFromRight: boolean
    ): number | null {
        const crossed = approachingFromRight
            ? prevCx >= faceX && cx < faceX
            : prevCx <= faceX && cx > faceX;
        if (!crossed) return null;
        const t = (faceX - prevCx) / (cx - prevCx);
        const cyAtCross = prevCy + t * (cy - prevCy);
        return cyAtCross >= yMin && cyAtCross <= yMax ? cyAtCross : null;
    }

    // Determina se a colisão foi na face frontal ou no topo/base, usando o MTD (minimum translation vector).
    function getCollisionSide(
        cx: number, cy: number, r: number,
        rx: number, ry: number, rw: number, rh: number
    ): 'front' | 'topbottom' {
        const closestX = Math.max(rx, Math.min(cx, rx + rw));
        const closestY = Math.max(ry, Math.min(cy, ry + rh));
        const dx = cx - closestX;
        const dy = cy - closestY;
        if (dx === 0 && dy === 0) return 'front';
        const penX = r - Math.abs(dx);
        const penY = r - Math.abs(dy);
        return penX <= penY ? 'front' : 'topbottom';
    }

    useEffect(() => {
        // Resetar posição anterior para o swept test não usar dados de um ciclo anterior
        prevBallCxRef.current = null;
        prevBallCyRef.current = null;

        // Cancelar qualquer loop RAF anterior — garante um único loop activo
        if (collisionRafRef.current !== null) {
            cancelAnimationFrame(collisionRafRef.current);
            collisionRafRef.current = null;
        }

        function applyFrontCollision(
            cy: number,
            barraCenterY: number, barraHalfH: number,
            barraVyRef: { current: number },
            directionSign: 1 | -1  // +1 para barra1 (bola vai para a direita), -1 para barra2
        ) {
            const impact = Math.max(-1, Math.min(1, (cy - barraCenterY) / barraHalfH));
            const speed = Math.sqrt(VxRef.current ** 2 + VyRef.current ** 2) * 1.05;
            const angle = impact * (Math.PI / 3);
            VxRef.current = directionSign * Math.abs(speed * Math.cos(angle));
            VyRef.current = speed * Math.sin(angle) + barraVyRef.current * 0.5;
        }

        function applyTopBottomCollision(cy: number, barraCenterY: number) {
            // Bola bateu no topo → rebate para cima; na base → rebate para baixo
            VyRef.current = cy < barraCenterY ? -Math.abs(VyRef.current) : Math.abs(VyRef.current);
        }

        function checkCollision() {
            if (!bolaRef.current || !barra1Ref.current || !barra2Ref.current) {
                collisionRafRef.current = requestAnimationFrame(checkCollision);
                return;
            }

            if (cooldownRef.current > 0) {
                cooldownRef.current--;
                collisionRafRef.current = requestAnimationFrame(checkCollision);
                return;
            }

            const bolaRect = bolaRef.current.getBoundingClientRect();
            const cx = bolaRect.left + bolaRect.width / 2;
            const cy = bolaRect.top + bolaRect.height / 2;
            const r = bolaRect.width / 2;

            const prevCx = prevBallCxRef.current;
            const prevCy = prevBallCyRef.current;
            prevBallCxRef.current = cx;
            prevBallCyRef.current = cy;

            const barra1Rect = barra1Ref.current.getBoundingClientRect();
            const barra2Rect = barra2Ref.current.getBoundingClientRect();

            // --- Barra 1 (face direita) ---
            let hit1 = circleOverlapsRect(cx, cy, r, barra1Rect.left, barra1Rect.top, barra1Rect.width, barra1Rect.height);

            // Swept test: detectar tunneling através da face direita da barra1
            if (!hit1 && prevCx !== null && prevCy !== null) {
                const cyAtCross = sweptFaceCrossing(
                    prevCx, prevCy, cx, cy,
                    barra1Rect.right, barra1Rect.top - r, barra1Rect.bottom + r,
                    true // bola vinha da direita
                );
                if (cyAtCross !== null) {
                    // Colisão por tunneling — tratar como batida na face frontal
                    applyFrontCollision(cyAtCross, barra1Rect.top + barra1Rect.height / 2, barra1Rect.height / 2, barra1VyRef, 1);
                    cooldownRef.current = 20;
                    collisionRafRef.current = requestAnimationFrame(checkCollision);
                    return;
                }
            }

            if (hit1) {
                const side = getCollisionSide(cx, cy, r, barra1Rect.left, barra1Rect.top, barra1Rect.width, barra1Rect.height);
                if (side === 'topbottom') {
                    applyTopBottomCollision(cy, barra1Rect.top + barra1Rect.height / 2);
                } else {
                    applyFrontCollision(cy, barra1Rect.top + barra1Rect.height / 2, barra1Rect.height / 2, barra1VyRef, 1);
                }
                cooldownRef.current = 20;
                collisionRafRef.current = requestAnimationFrame(checkCollision);
                return;
            }

            // --- Barra 2 (face esquerda) ---
            let hit2 = circleOverlapsRect(cx, cy, r, barra2Rect.left, barra2Rect.top, barra2Rect.width, barra2Rect.height);

            if (!hit2 && prevCx !== null && prevCy !== null) {
                const cyAtCross = sweptFaceCrossing(
                    prevCx, prevCy, cx, cy,
                    barra2Rect.left, barra2Rect.top - r, barra2Rect.bottom + r,
                    false // bola vinha da esquerda
                );
                if (cyAtCross !== null) {
                    applyFrontCollision(cyAtCross, barra2Rect.top + barra2Rect.height / 2, barra2Rect.height / 2, barra2VyRef, -1);
                    cooldownRef.current = 20;
                    collisionRafRef.current = requestAnimationFrame(checkCollision);
                    return;
                }
            }

            if (hit2) {
                const side = getCollisionSide(cx, cy, r, barra2Rect.left, barra2Rect.top, barra2Rect.width, barra2Rect.height);
                if (side === 'topbottom') {
                    applyTopBottomCollision(cy, barra2Rect.top + barra2Rect.height / 2);
                } else {
                    applyFrontCollision(cy, barra2Rect.top + barra2Rect.height / 2, barra2Rect.height / 2, barra2VyRef, -1);
                }
                cooldownRef.current = 20;
            }

            collisionRafRef.current = requestAnimationFrame(checkCollision);
        }

        collisionRafRef.current = requestAnimationFrame(checkCollision);

        return () => {
            if (collisionRafRef.current !== null) {
                cancelAnimationFrame(collisionRafRef.current);
                collisionRafRef.current = null;
            }
        };
    }, []); // deps vazias: todas as velocidades lidas de refs

    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <Pontuacao score1={score[0]} score2={score[1]} />
            <ManualMover
                v={500}
                initialX={100}
                initialY={window.innerHeight / 2}
                keys={new Map([
                    ["w", "up"],
                    ["s", "down"],
                    ["space", "shoot"],
                ])}
                onVelocityChange={(v) => { barra1VyRef.current = v; }}
            >
                <Barra ref={barra1Ref} height={200} width={20} />
            </ManualMover>

            <ManualMover
                v={500}
                initialX={window.innerWidth - 100}
                initialY={window.innerHeight / 2}
                keys={new Map([
                    ["ArrowUp", "up"],
                    ["ArrowDown", "down"],
                    ["enter", "shoot"],
                ])}
                onVelocityChange={(v) => { barra2VyRef.current = v; }}
            >
                <Barra ref={barra2Ref} height={200} width={20} />
            </ManualMover>

            <AutoMover
                vxRef={VxRef}
                vyRef={VyRef}
                initialX={window.innerWidth / 2 - BALL_RADIUS}
                initialY={window.innerHeight / 2 - BALL_RADIUS}
                onGoal={onGoal}
            >
                <Bola ref={bolaRef} radius={BALL_RADIUS} />
            </AutoMover>
        </div>
    );
}