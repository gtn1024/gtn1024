import { Button } from './components/ui/button'

function App() {
  return (
    <div className="h-screen">
      <div className="flex justify-center items-center h-full bg-gray-100 flex-col gap-2">
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
            <Button variant="link" asChild>
              <a href="https://github.com/gtn1024/resume/blob/master/resume.pdf">Resume</a>
            </Button>
          </div>
        </div>
        <div className='flex gap-2'>
          <img src="https://img.shields.io/badge/Java-000000?style=flat-square&logo=openjdk&logoColor=white" alt="Java" />
          <img src="https://img.shields.io/badge/Kotlin-000000?style=flat-square&logo=kotlin&logoColor=white" alt="Kotlin" />
          <img src="https://img.shields.io/badge/Nodejs-000000?style=flat-square&logo=nodedotjs&logoColor=white" alt="Nodejs" />
          <img src="https://img.shields.io/badge/Cangjie-000000?style=flat-square&logo=cangjie&logoColor=white" alt="Cangjie" />
        </div>
      </div>
    </div>
  )
}

export default App
