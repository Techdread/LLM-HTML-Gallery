"use client"

import { useState } from 'react'
import { Moon, Sun, Monitor } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
    const { theme, setTheme } = useTheme()
    const [mounted, setMounted] = useState(false)

    // useEffect(() => setMounted(true), [])

    if (!mounted) {
        return null
    }

    const cycleTheme = () => {
        if (theme === 'light') {
            setTheme('dark')
        } else if (theme === 'dark') {
            setTheme('system')
        } else {
            setTheme('light')
        }
    }

    const getIcon = () => {
        switch (theme) {
            case 'light':
                return <Sun className="h-4 w-4" />
            case 'dark':
                return <Moon className="h-4 w-4" />
            default:
                return <Monitor className="h-4 w-4" />
        }
    }

    return (
        <Button
            variant="outline"
            size="icon"
            onClick={cycleTheme}
            className="relative"
        >
            {getIcon()}
            <span className="sr-only">Toggle theme</span>
        </Button>
    )
}
