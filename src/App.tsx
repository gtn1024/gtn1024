import { Button } from './components/ui/button'

function App() {
  return (
    <div className="h-screen">
      <div className="flex justify-center items-center h-full bg-gray-100">
        <div className="">
          <div className="mb-4">
            <img className="rounded-[50%] mx-auto" src="https://github.com/gtn1024.png" alt="Avatar" />
          </div>
          <div className="flex justify-between">
            <Button variant="link" asChild>
              <a href="mailto:gtn1024@foxmail.com">Contact</a>
            </Button>
            <Button variant="link" asChild>
              <a href="https://github.com/gtn1024">GitHub</a>
            </Button>
            <Button variant="link" asChild>
              <a href="https://blog.gtn1024.me">Blog</a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
